import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createHighlight, getSocialCard, removeHighlight, saveSocialCard } from "@/lib/profile/server";
import { Link } from "@tanstack/react-router";

export function InstagramProfile() {
  const qc = useQueryClient();
  const card = useQuery({ queryKey: ["social-card"], queryFn: () => getSocialCard() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [highlightName, setHighlightName] = useState("");
  const [cover, setCover] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const data = card.data;

  async function saveHighlight() {
    setBusy(true);
    setError("");
    const result = await createHighlight({ data: { name: highlightName, cover } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setHighlightName("");
    setCover("");
    setOpen(false);
    await qc.invalidateQueries({ queryKey: ["social-card"] });
  }

  async function saveProfile() {
    setBusy(true);
    setError("");
    const result = await saveSocialCard({ data: { name, bio, photoUrl: photo } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    setPhoto("");
    await qc.invalidateQueries({ queryKey: ["social-card"] });
  }

  if (!data) return <div className="h-48 animate-pulse rounded-3xl bg-secondary" />;
  const letter = (data.name || data.handle || "U").slice(0, 1).toUpperCase();
  const shownPhoto = photo || data.photoUrl;

  return (
    <section>
      <header className="flex items-center justify-between py-1">
        <h1 className="text-xl font-semibold tracking-tight">{data.handle}</h1>
      </header>

      <div className="mt-3 flex items-center gap-6">
        {shownPhoto ? (
          <img src={shownPhoto} alt="" className="size-[86px] shrink-0 rounded-full object-cover" />
        ) : (
          <div className="grid size-[86px] shrink-0 place-items-center rounded-full bg-secondary text-2xl font-semibold">{letter}</div>
        )}
        <dl className="grid flex-1 grid-cols-3 text-center">
          <Stat n={data.posts} label="posts" />
          <Stat n={data.followers} label="followers" />
          <Stat n={data.following} label="following" />
        </dl>
      </div>

      <p className="mt-3 text-sm font-semibold">{data.name}</p>
      {data.bio ? <p className="mt-0.5 max-w-sm whitespace-pre-wrap text-sm">{data.bio}</p> : null}

      {editing ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile();
          }}
        >
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="h-11 w-full rounded-xl bg-secondary px-3 text-sm outline-none" />
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Bio" className="min-h-20 w-full rounded-xl bg-secondary p-3 text-sm outline-none" />
          <label className="block text-xs text-muted-foreground">
            Profile photo
            <input
              type="file"
              accept="image/*"
              className="mt-1 block text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : "");
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="h-9 flex-1 rounded-lg bg-ink text-sm font-semibold text-paper">
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" className="h-9 rounded-lg bg-secondary px-3 text-sm font-semibold" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="mt-3 h-9 w-full rounded-lg bg-secondary text-sm font-semibold"
          onClick={() => {
            setName(data.name);
            setBio(data.bio);
            setPhoto("");
            setError("");
            setEditing(true);
          }}
        >
          Edit profile
        </button>
      )}

      <div className="mt-5 flex gap-4 overflow-x-auto pb-1">
        <button type="button" className="w-[72px] shrink-0 text-center" onClick={() => { setOpen(true); setError(""); }}>
          <span className="mx-auto grid size-[68px] place-items-center rounded-full border border-dashed border-foreground text-2xl">+</span>
          <span className="mt-1 block truncate text-[11px]">New</span>
        </button>
        {data.highlights.map((highlight) => (
          <div key={highlight.id} className="w-[72px] shrink-0 text-center">
            <div className="mx-auto grid size-[68px] place-items-center overflow-hidden rounded-full bg-secondary p-[2px] ring-1 ring-border">
              <span className="grid size-full place-items-center overflow-hidden rounded-full bg-background">
                {highlight.cover ? <img src={highlight.cover} alt="" className="size-full object-cover" /> : <span className="text-sm font-semibold">{highlight.name.slice(0, 1).toUpperCase()}</span>}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px]">{highlight.name}</p>
            <button
              type="button"
              className="text-[10px] text-muted-foreground"
              onClick={() => {
                void removeHighlight({ data: { id: highlight.id } }).then(() => qc.invalidateQueries({ queryKey: ["social-card"] }));
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {!data.highlights.length && !open ? (
        <p className="mt-1 text-xs text-muted-foreground">Highlights stay empty until you start one.</p>
      ) : null}
      {open ? (
        <form
          className="mt-3 space-y-2 rounded-2xl bg-card p-3 ring-1 ring-border"
          onSubmit={(event) => {
            event.preventDefault();
            void saveHighlight();
          }}
        >
          <p className="text-sm font-medium">New highlight</p>
          <input value={highlightName} onChange={(event) => setHighlightName(event.target.value)} placeholder="Name" className="h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border outline-none" />
          <label className="block text-xs text-muted-foreground">
            Cover, if you want one
            <input
              type="file"
              accept="image/*"
              className="mt-1 block text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setCover(typeof reader.result === "string" ? reader.result : "");
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {error && !editing ? <p className="text-sm text-muted-foreground">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="h-10 flex-1 rounded-lg bg-ink text-sm font-semibold text-paper">
              {busy ? "Saving…" : "Add highlight"}
            </button>
            <button type="button" className="h-10 rounded-lg px-3 text-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 border-t border-border pt-0.5">
        <div className="grid grid-cols-3 gap-0.5">
          {data.grid.map((post) => (
            <div key={post.id} className="aspect-square bg-secondary p-2 text-[11px] leading-snug">
              {post.image ? <img src={post.image} alt="" className="size-full object-cover" /> : <span className="line-clamp-6">{post.body}</span>}
            </div>
          ))}
        </div>
        {!data.grid.length ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No posts yet. Publish one on <Link to="/board" className="font-medium text-foreground">Board</Link>.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <dt className="text-base font-semibold">{n}</dt>
      <dd className="text-xs">{label}</dd>
    </div>
  );
}
