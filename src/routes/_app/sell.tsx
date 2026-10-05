import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/unibud/catalog";
import { createListing } from "@/lib/unibud/server";
import { koboFromNairaInput } from "@/lib/unibud/format";
import type { ListingCategory, ListingKind } from "@/lib/unibud/types";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/sell")({ component: SellPage });

function SellPage() {
  return (
    <RequireAuth>
      <SellForm />
    </RequireAuth>
  );
}

function SellForm() {
  const router = useRouter();
  const [kind, setKind] = useState<ListingKind>("goods");
  const [category, setCategory] = useState<ListingCategory>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [naira, setNaira] = useState("");
  const [priceNote, setPriceNote] = useState("asking");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const kobo = koboFromNairaInput(naira);
    if (kobo == null) {
      toast.error("Enter a price in naira");
      return;
    }
    setBusy(true);
    try {
      const listing = await createListing({
        data: {
          kind,
          category,
          title,
          description,
          priceKobo: kobo,
          priceNote,
          location,
        },
      });
      await router.invalidate();
      toast.success("Listed");
      await router.navigate({ to: "/market/$listingId", params: { listingId: listing.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not list");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-5 pb-10">
      <div>
        <p className="text-xs font-medium tracking-widest text-bud uppercase">Sell</p>
        <h1 className="mt-1 font-display text-4xl">List something campus can use</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Be honest. No impersonation. Payments stay on the demo ledger.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["goods", "service", "stay"] as ListingKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={
              kind === k
                ? "h-11 rounded-md bg-paper text-sm font-medium text-ink"
                : "h-11 rounded-md border border-border text-sm text-muted-foreground"
            }
          >
            {k}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat">Category</Label>
        <select
          id="cat"
          value={category}
          onChange={(e) => setCategory(e.target.value as ListingCategory)}
          className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="desc">Description</Label>
        <Textarea id="desc" required value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="price">Price (₦)</Label>
          <Input
            id="price"
            inputMode="decimal"
            required
            value={naira}
            onChange={(e) => setNaira(e.target.value)}
            placeholder="15000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="note">Price note</Label>
          <Input id="note" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="loc">Location</Label>
        <Input
          id="loc"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Yaba, second gate, remote…"
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Publishing…" : "Publish listing"}
      </Button>
    </form>
  );
}
