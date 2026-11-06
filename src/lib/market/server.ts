import { createServerFn } from "@tanstack/react-start";
import { appAccessMiddleware } from "@/lib/account/guard";
import { getSql } from "@/lib/db";
import { notify } from "@/lib/unibud/server";
import { fixtureListingIds } from "@/lib/unibud/fixture-filter";
import type { ListingCategory, ListingKind } from "@/lib/unibud/types";

export type MarketItem = {
  id: string;
  kind: string;
  category: string;
  title: string;
  description: string;
  priceKobo: number;
  priceNote: string;
  image?: string;
  sellerHandle: string;
  sellerName: string;
  location: string;
  status: "available" | "reserved" | "sold";
  createdAt: string;
  mine: boolean;
};

export type MarketOffer = {
  id: string;
  buyerHandle: string;
  buyerName: string;
  note: string;
  status: string;
  createdAt: string;
};

const KINDS = new Set(["goods", "service", "stay"]);

function clean(value: string, max: number) {
  return value.trim().slice(0, max);
}

async function sellerIdentity(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ handle: string; name: string }>`
    select coalesce(nullif(p.handle, ''), a.username, 'member') as handle,
      coalesce(nullif(p.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), a.username, 'Member') as name
    from unibud_accounts a
    left join connect_profiles p on p.user_id = a.user_id
    where a.user_id = ${userId}
    limit 1`;
  return rows[0] ?? { handle: "member", name: "Member" };
}

type Row = {
  id: string;
  kind: string;
  category: string;
  title: string;
  description: string;
  price_kobo: number;
  price_note: string;
  image: string | null;
  seller_handle: string;
  seller_name: string;
  location: string;
  status: string | null;
  created_at: string;
  owner_user_id: string | null;
};

function mapItem(row: Row, viewerId: string): MarketItem {
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    title: row.title,
    description: row.description,
    priceKobo: row.price_kobo,
    priceNote: row.price_note,
    image: row.image || undefined,
    sellerHandle: row.seller_handle,
    sellerName: row.seller_name,
    location: row.location,
    status: row.status === "sold" ? "sold" : row.status === "reserved" ? "reserved" : "available",
    createdAt: String(row.created_at),
    mine: row.owner_user_id === viewerId,
  };
}

export const listMarket = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((input?: { q?: string; category?: string }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const q = clean(data.q ?? "", 80).toLowerCase();
    const category = clean(data.category ?? "", 40);
    const rows = await sql<Row>`
      select l.id, l.kind, l.category, l.title, l.description, l.price_kobo, l.price_note, l.image,
        l.location, l.status, l.created_at, l.owner_user_id,
        coalesce(nullif(p.handle, ''), a.username, l.seller_handle) as seller_handle,
        coalesce(nullif(p.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), a.username, l.seller_handle) as seller_name
      from listings l
      left join unibud_accounts a on a.user_id = l.owner_user_id
      left join connect_profiles p on p.user_id = l.owner_user_id
      where l.owner_user_id is not null
        and (${category} = '' or ${category} = 'all' or l.category = ${category})
        and (
          ${q} = ''
          or strpos(lower(l.title), ${q}) > 0
          or strpos(lower(l.description), ${q}) > 0
          or strpos(lower(l.location), ${q}) > 0
          or strpos(lower(coalesce(p.handle, a.username, l.seller_handle)), ${q}) > 0
        )
      order by case when l.status = 'sold' then 1 else 0 end, l.created_at desc
      limit 60`;
    return rows.filter((row) => !fixtureListingIds.has(row.id)).map((row) => mapItem(row, context.userId));
  });

export const getMarketListing = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    if (fixtureListingIds.has(id)) return { ok: false as const, error: "That listing is not for sale." };
    const sql = await getSql();
    const rows = await sql<Row>`
      select l.id, l.kind, l.category, l.title, l.description, l.price_kobo, l.price_note, l.image,
        l.location, l.status, l.created_at, l.owner_user_id,
        coalesce(nullif(p.handle, ''), a.username, l.seller_handle) as seller_handle,
        coalesce(nullif(p.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), a.username, l.seller_handle) as seller_name
      from listings l
      left join unibud_accounts a on a.user_id = l.owner_user_id
      left join connect_profiles p on p.user_id = l.owner_user_id
      where l.id = ${id}
      limit 1`;
    const row = rows[0];
    if (!row || !row.owner_user_id) return { ok: false as const, error: "That listing is gone." };
    const item = mapItem(row, context.userId);
    const mine = item.mine;
    const offers = mine
      ? await sql<{ id: string; note: string; status: string; created_at: string; buyer_handle: string; buyer_name: string }>`
          select o.id, o.note, o.status, o.created_at,
            coalesce(nullif(p.handle, ''), a.username, 'member') as buyer_handle,
            coalesce(nullif(p.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), a.username, 'Member') as buyer_name
          from market_offers o
          left join unibud_accounts a on a.user_id = o.buyer_id
          left join connect_profiles p on p.user_id = o.buyer_id
          where o.listing_id = ${id}
          order by o.created_at desc
          limit 30`
      : [];
    const mineOffer = mine
      ? []
      : await sql<{ id: string; status: string }>`
          select id, status from market_offers
          where listing_id = ${id} and buyer_id = ${context.userId}
          order by created_at desc limit 1`;
    return {
      ok: true as const,
      item,
      offers: offers.map((offer) => ({
        id: offer.id,
        buyerHandle: offer.buyer_handle,
        buyerName: offer.buyer_name,
        note: offer.note,
        status: offer.status,
        createdAt: String(offer.created_at),
      })) satisfies MarketOffer[],
      myOffer: mineOffer[0] ? { id: mineOffer[0].id, status: mineOffer[0].status } : null,
    };
  });

export const createMarketListing = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator(
    (input: {
      kind: ListingKind;
      category: ListingCategory;
      title: string;
      description: string;
      priceKobo: number;
      priceNote: string;
      location: string;
      image?: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const title = clean(data.title, 80);
    const description = clean(data.description, 800);
    if (title.length < 2) return { ok: false as const, error: "Give the listing a title." };
    if (description.length < 2) return { ok: false as const, error: "Describe what you are selling." };
    if (!KINDS.has(data.kind)) return { ok: false as const, error: "Choose goods, a service, or a stay." };
    if (!Number.isFinite(data.priceKobo) || data.priceKobo < 0) return { ok: false as const, error: "Enter a price in naira." };
    const image = data.image?.startsWith("data:image/") ? data.image.slice(0, 400_000) : "";
    const who = await sellerIdentity(context.userId);
    const sql = await getSql();
    const id = `l_${crypto.randomUUID().slice(0, 8)}`;
    await sql`insert into listings (
      id, owner_user_id, kind, category, title, description, price_kobo, price_note,
      image, tone, seller_handle, university_id, location, tags, status
    ) values (
      ${id}, ${context.userId}, ${data.kind}, ${data.category}, ${title}, ${description},
      ${Math.round(data.priceKobo)}, ${clean(data.priceNote || "asking", 40)},
      ${image || null}, ${"ink"}, ${who.handle}, ${"campus"}, ${clean(data.location, 80) || "Campus"}, ${"[]"}, ${"available"}
    )`;
    return { ok: true as const, id };
  });

export const setListingStatus = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string; status: "available" | "sold" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ owner_user_id: string }>`select owner_user_id from listings where id = ${data.id} limit 1`;
    if (rows[0]?.owner_user_id !== context.userId) return { ok: false as const, error: "Only the seller can change this listing." };
    const status = data.status === "sold" ? "sold" : "available";
    await sql`update listings set status = ${status} where id = ${data.id}`;
    return { ok: true as const };
  });

export const offerToBuy = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string; note?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ owner_user_id: string; title: string; status: string; seller_handle: string }>`
      select owner_user_id, title, status, seller_handle from listings where id = ${data.id} limit 1`;
    const listing = rows[0];
    if (!listing?.owner_user_id) return { ok: false as const, error: "That listing is gone." };
    if (listing.owner_user_id === context.userId) return { ok: false as const, error: "You cannot buy your own listing." };
    if (listing.status === "sold" || listing.status === "reserved") return { ok: false as const, error: "This is no longer open to a new request." };
    const existing = await sql<{ id: string }>`
      select id from market_offers where listing_id = ${data.id} and buyer_id = ${context.userId} and status = ${"pending"} limit 1`;
    if (existing[0]) return { ok: false as const, error: "You already asked to buy this." };
    const id = crypto.randomUUID();
    const note = clean(data.note ?? "", 280);
    await sql`insert into market_offers (id, listing_id, buyer_id, status, note) values (${id}, ${data.id}, ${context.userId}, ${"pending"}, ${note})`;
    const who = await sellerIdentity(context.userId);
    try {
      await notify(
        listing.owner_user_id,
        "money",
        `${who.name} (@${who.handle}) wants to buy`,
        note || listing.title,
        `/orders`,
      );
    } catch {
      /* The offer still stands if the notice fails. */
    }
    return { ok: true as const };
  });

export const respondOffer = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string; action: "accept" | "decline" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; listing_id: string; buyer_id: string; status: string; owner_user_id: string; title: string }>`
      select o.id, o.listing_id, o.buyer_id, o.status, l.owner_user_id, l.title
      from market_offers o
      join listings l on l.id = o.listing_id
      where o.id = ${data.id}
      limit 1`;
    const offer = rows[0];
    if (!offer || offer.owner_user_id !== context.userId) return { ok: false as const, error: "Only the seller can answer this." };
    if (offer.status !== "pending") return { ok: false as const, error: "That request is no longer waiting." };
    if (data.action === "decline") {
      await sql`update market_offers set status = ${"declined"} where id = ${offer.id}`;
      return { ok: true as const };
    }
    const open = await sql<{ id: string }>`
      select id from market_offers where listing_id = ${offer.listing_id} and status in ('accepted', 'ready') and id <> ${offer.id} limit 1`;
    if (open[0]) return { ok: false as const, error: "Another order is already in progress for this listing." };
    await sql`update market_offers set status = ${"accepted"} where id = ${offer.id}`;
    await sql`update listings set status = ${"reserved"} where id = ${offer.listing_id}`;
    await sql`update market_offers set status = ${"declined"} where listing_id = ${offer.listing_id} and status = ${"pending"} and id <> ${offer.id}`;
    const who = await sellerIdentity(context.userId);
    try {
      await notify(offer.buyer_id, "money", `${who.name} (@${who.handle}) accepted your order`, `“${offer.title}” is reserved. Follow it in Orders. No payment was taken in UNIBUD.`, "/orders");
    } catch {
      /* The order still stands. */
    }
    return { ok: true as const };
  });

export const advanceOrder = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string; action: "ready" | "complete" | "cancel" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; listing_id: string; buyer_id: string; status: string; owner_user_id: string; title: string }>`
      select o.id, o.listing_id, o.buyer_id, o.status, l.owner_user_id, l.title
      from market_offers o
      join listings l on l.id = o.listing_id
      where o.id = ${data.id}
      limit 1`;
    const offer = rows[0];
    if (!offer) return { ok: false as const, error: "That order is gone." };
    const seller = offer.owner_user_id === context.userId;
    const buyer = offer.buyer_id === context.userId;
    if (!seller && !buyer) return { ok: false as const, error: "That order is not yours." };
    if (data.action === "ready") {
      if (!seller || offer.status !== "accepted") return { ok: false as const, error: "Only the seller can mark an accepted order ready." };
      await sql`update market_offers set status = ${"ready"} where id = ${offer.id}`;
      try { await notify(offer.buyer_id, "money", "Order ready", `“${offer.title}” is ready to collect.`, "/orders"); } catch { /* posted */ }
      return { ok: true as const };
    }
    if (data.action === "complete") {
      if (offer.status !== "accepted" && offer.status !== "ready") return { ok: false as const, error: "This order is not ready to close." };
      await sql`update market_offers set status = ${"completed"} where id = ${offer.id}`;
      await sql`update listings set status = ${"sold"} where id = ${offer.listing_id}`;
      const other = seller ? offer.buyer_id : offer.owner_user_id;
      try { await notify(other, "money", "Order collected", `“${offer.title}” is complete.`, "/orders"); } catch { /* posted */ }
      return { ok: true as const };
    }
    if (offer.status !== "pending" && offer.status !== "accepted" && offer.status !== "ready") {
      return { ok: false as const, error: "That order can no longer be cancelled." };
    }
    if (offer.status === "pending" && !buyer) return { ok: false as const, error: "Only the buyer can cancel a request that has not been accepted." };
    await sql`update market_offers set status = ${"cancelled"} where id = ${offer.id}`;
    if (offer.status !== "pending") await sql`update listings set status = ${"available"} where id = ${offer.listing_id} and status = ${"reserved"}`;
    const other = seller ? offer.buyer_id : offer.owner_user_id;
    try { await notify(other, "money", "Order cancelled", `“${offer.title}” was cancelled.`, "/orders"); } catch { /* posted */ }
    return { ok: true as const };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      status: string;
      note: string;
      created_at: string;
      listing_id: string;
      title: string;
      price_kobo: number;
      owner_user_id: string;
      buyer_id: string;
      buyer_handle: string;
      buyer_name: string;
      seller_handle: string;
      seller_name: string;
    }>`
      select o.id, o.status, o.note, o.created_at, l.id as listing_id, l.title, l.price_kobo, l.owner_user_id, o.buyer_id,
        coalesce(nullif(bp.handle, ''), ba.username, 'member') as buyer_handle,
        coalesce(nullif(bp.display_name, ''), ba.username, 'Member') as buyer_name,
        coalesce(nullif(sp.handle, ''), sa.username, 'member') as seller_handle,
        coalesce(nullif(sp.display_name, ''), sa.username, 'Member') as seller_name
      from market_offers o
      join listings l on l.id = o.listing_id
      left join unibud_accounts ba on ba.user_id = o.buyer_id
      left join connect_profiles bp on bp.user_id = o.buyer_id
      left join unibud_accounts sa on sa.user_id = l.owner_user_id
      left join connect_profiles sp on sp.user_id = l.owner_user_id
      where o.buyer_id = ${context.userId} or l.owner_user_id = ${context.userId}
      order by o.created_at desc
      limit 60`;
    return rows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      title: row.title,
      priceKobo: Number(row.price_kobo),
      note: row.note,
      status: row.status,
      at: String(row.created_at),
      role: row.owner_user_id === context.userId ? "selling" as const : "buying" as const,
      peerName: row.owner_user_id === context.userId ? row.buyer_name : row.seller_name,
      peerHandle: row.owner_user_id === context.userId ? row.buyer_handle : row.seller_handle,
    }));
  });
