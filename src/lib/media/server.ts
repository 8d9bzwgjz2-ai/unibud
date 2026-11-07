import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseDataUrl, removeMediaBytes, writeMediaBytes } from "./store.server";
import { kindFromMime, MAX_UPLOAD_BYTES, type MediaKind } from "./types";
import { BUD_MEDIA } from "./bud-media";
import { REVENUE_POLICY } from "@/lib/music/monetization";

async function ensureBudSeed() {
  const sql = await getSql();
  for (const m of BUD_MEDIA) {
    const existing = await sql`select id from bud_media where id = ${m.id} limit 1`;
    if (existing[0]) continue;
    await sql`insert into bud_media (id, owner_id, kind, title, course, duration_min, status, visibility)
      values (${m.id}, ${"unibud-academic"}, ${m.kind}, ${m.title}, ${m.course ?? null}, ${m.durationMin}, ${"awaiting_file"}, ${"class"})`;
  }
}

export const uploadMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dataUrl: string; fileName: string; mime?: string; kind?: MediaKind; conversationId?: string; roomId?: string }) => input)
  .handler(async ({ context, data }) => {
    const parsed = parseDataUrl(data.dataUrl);
    if (parsed.bytes.length > MAX_UPLOAD_BYTES) {
      return { ok: false as const, error: "That file is over 8 MB." };
    }
    const mime = data.mime || parsed.mime;
    const kind = data.kind ?? kindFromMime(mime);
    const id = crypto.randomUUID();
    const sql = await getSql();
    await sql`insert into media_assets (id, owner_id, kind, mime_type, file_name, file_size, storage_path, status, visibility, conversation_id, room_id)
      values (${id}, ${context.userId}, ${kind}, ${mime}, ${data.fileName}, ${parsed.bytes.length}, ${id}, ${"processing"}, ${data.roomId ? "room" : data.conversationId ? "conversation" : "private"}, ${data.conversationId ?? null}, ${data.roomId ?? null})`;
    try {
      await writeMediaBytes(id, parsed.bytes);
      await sql`update media_assets set status = ${"ready"}, updated_at = now() where id = ${id}`;
      return { ok: true as const, id, kind, mime, size: parsed.bytes.length };
    } catch (err) {
      await sql`update media_assets set status = ${"failed"}, error = ${String(err)}, updated_at = now() where id = ${id}`;
      return { ok: false as const, error: "Upload failed. Try again." };
    }
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql`select owner_id from media_assets where id = ${id} limit 1`;
    if (!rows[0] || String(rows[0].owner_id) !== context.userId) throw new Error("Not allowed");
    await sql`update media_assets set status = ${"deleted"}, updated_at = now() where id = ${id}`;
    await removeMediaBytes(id);
    return { ok: true };
  });

export const reportMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { mediaId?: string; audioId?: string; reason: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into media_reports (id, media_id, audio_id, reporter_id, reason)
      values (${crypto.randomUUID()}, ${data.mediaId ?? null}, ${data.audioId ?? null}, ${context.userId}, ${data.reason})`;
    return { ok: true };
  });

export const listBudMedia = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureBudSeed();
    const sql = await getSql();
    const rows = await sql`select * from bud_media order by created_at desc`;
    return rows.map((r) => ({
      id: String(r.id),
      kind: String(r.kind),
      title: String(r.title),
      course: r.course ? String(r.course) : undefined,
      durationMin: Number(r.duration_min ?? 0),
      mediaId: r.media_id ? String(r.media_id) : undefined,
      status: String(r.status),
      lecturer: r.lecturer ? String(r.lecturer) : undefined,
      origin: "bud" as const,
    }));
  });

export const attachBudFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { budId: string; mediaId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const owned = await sql`select id from media_assets where id = ${data.mediaId} and owner_id = ${context.userId} and status = ${"ready"}`;
    if (!owned[0]) throw new Error("Media not ready");
    await sql`update bud_media set media_id = ${data.mediaId}, status = ${"ready"} where id = ${data.budId}`;
    return { ok: true };
  });

export const listRoomMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((roomId: string) => roomId)
  .handler(async ({ data: roomId }) => {
    const sql = await getSql();
    const rows = await sql`select * from room_messages where room_id = ${roomId} order by created_at asc`;
    return rows.map((r) => ({
      id: String(r.id),
      sender: String(r.sender_name),
      body: String(r.body),
      mediaId: r.media_id ? String(r.media_id) : undefined,
      shareKind: r.share_kind ? String(r.share_kind) : undefined,
      shareJson: r.share_json ? String(r.share_json) : undefined,
      createdAt: String(r.created_at),
    }));
  });

export const sendRoomMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { roomId: string; body: string; senderName: string; mediaId?: string; shareKind?: string; shareJson?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into room_messages (id, room_id, user_id, sender_name, body, media_id, share_kind, share_json)
      values (${id}, ${data.roomId}, ${context.userId}, ${data.senderName}, ${data.body}, ${data.mediaId ?? null}, ${data.shareKind ?? null}, ${data.shareJson ?? null})`;
    const rows = await sql`select * from room_messages where room_id = ${data.roomId} order by created_at asc`;
    return rows.map((r) => ({
      id: String(r.id),
      sender: String(r.sender_name),
      body: String(r.body),
      mediaId: r.media_id ? String(r.media_id) : undefined,
      shareKind: r.share_kind ? String(r.share_kind) : undefined,
      shareJson: r.share_json ? String(r.share_json) : undefined,
      createdAt: String(r.created_at),
    }));
  });

export const persistAudioEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: string; audioId?: string; budMediaId?: string; providerId?: string; surface: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into audio_events (id, kind, user_id, audio_id, bud_media_id, provider_id, surface)
      values (${crypto.randomUUID()}, ${data.kind}, ${context.userId}, ${data.audioId ?? null}, ${data.budMediaId ?? null}, ${data.providerId ?? null}, ${data.surface})`;
    return { ok: true };
  });

export const recordPartnerClick = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider: string; trackId?: string; surface?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into partner_clicks (id, user_id, provider, track_id, surface, revenue_kobo)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.provider}, ${data.trackId ?? null}, ${data.surface ?? null}, ${REVENUE_POLICY.revenueKobo})`;
    return { ok: true, revenueKobo: 0 };
  });
