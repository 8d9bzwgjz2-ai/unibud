import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ListingCard } from "@/components/unibud/listing-card";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { koboFromNairaInput } from "@/lib/unibud/format";
import { createListing } from "@/lib/unibud/server";
import { useCatalog } from "@/lib/unibud/queries";
import { getMyProfile } from "@/lib/unibud/server";

export const Route = createFileRoute("/_app/creator")({ component: Creator });

function Creator() {
  const { user, isPending } = useAuthReady();
  const { data, refetch } = useCatalog();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => getMyProfile(),
    enabled: Boolean(user),
  });
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("15000");
  const mine = (data?.listings ?? []).filter(
    (l) => l.sellerHandle === profile.data?.handle && l.kind === "service",
  );

  const mut = useMutation({
    mutationFn: () => {
      const kobo = koboFromNairaInput(price) ?? 0;
      return createListing({
        data: {
          kind: "service",
          category: "services",
          title,
          description,
          priceKobo: kobo,
          priceNote: "starting",
          location: "Campus / remote",
        },
      });
    },
    onSuccess: () => {
      toast.success("Service listed");
      setTitle("");
      setDescription("");
      void refetch();
      void qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <div className="m-4 h-40 animate-pulse rounded-2xl bg-secondary" />;
  if (!user) {
    return (
      <main className="px-4 py-8 md:px-6">
        <h1 className="text-2xl font-medium">Creator Space</h1>
        <div className="mt-6">
          <SignInCard
            title="Show what you make"
            body="Portfolio, services, and campus audience — without an agent dashboard."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pb-8 md:px-6">
      <h1 className="pt-2 text-2xl font-medium tracking-tight">Creator Space</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Video, design, music, writing, events, tutoring. Publish a service students can actually book.
      </p>
      <section className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-border">
        <h2 className="font-medium">New service</h2>
        <Input className="mt-3" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="I edit graduation films" />
        <Textarea className="mt-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What you do, how long, where" />
        <Input className="mt-2" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Starting price ₦" />
        <Button className="mt-4" onClick={() => mut.mutate()} disabled={!title.trim() || mut.isPending}>
          Publish to market
        </Button>
      </section>
      <h2 className="mt-8 text-sm font-medium">Your services</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {mine.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
      <Link to="/market" search={{ cat: "services" }} className="mt-6 inline-block text-sm text-bud">
        See all campus services
      </Link>
    </main>
  );
}
