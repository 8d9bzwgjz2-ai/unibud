import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Lock, MapPin, MessageCircle, RefreshCw, Sparkles, TriangleAlert, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { setSoulync, soulyncState, soulyncSwipe } from "@/lib/places/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/connect/soulync")({ component: SouLync });

type Card = {
  userId: string;
  name: string;
  handle: string;
  photo: string;
  bio: string;
  institution: string;
  interests: string;
  spot: string;
  km: number | null;
  note: string;
};

type Tab = "discover" | "likes" | "matches" | "profile";
type Lane = "all" | "new" | "campus" | "spot" | "night" | "coffee" | "outdoors";

const INTRO_KEY = "soulync-intro";

function SouLync() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("discover");
  const [lane, setLane] = useState<Lane>("all");
  const [explore, setExplore] = useState(false);
  const [intro, setIntro] = useState(false);
  const [match, setMatch] = useState<{ threadId: string; name: string; handle: string; photo: string } | null>(null);
  const [error, setError] = useState("");
  const [noteFor, setNoteFor] = useState<Card | null>(null);
  const [note, setNote] = useState("");
  const [spotDraft, setSpotDraft] = useState("");
  const [locPhase, setLocPhase] = useState<"ask" | "name" | "denied">("ask");
  const state = useQuery({
    queryKey: ["soulync", lane],
    queryFn: () => soulyncState({ data: { lane } }),
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["soulync"] });
  };
  const toggle = useMutation({
    mutationFn: (input: { on: boolean; spot?: string; lat?: number | null; lng?: number | null }) => setSoulync({ data: input }),
    onSuccess: refresh,
  });
  const swipe = useMutation({
    mutationFn: (input: { userId: string; direction: "like" | "pass"; note?: string }) => soulyncSwipe({ data: input }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setNoteFor(null);
      setNote("");
      if (result.match) setMatch(result.match);
      await refresh();
    },
  });

  useEffect(() => {
    if (state.data?.on && state.data.me.spot) setSpotDraft(state.data.me.spot);
  }, [state.data]);

  const placed = Boolean(state.data?.me.spot) || Boolean(state.data?.me.pinned);
  const naming = locPhase === "name" && Boolean(state.data?.on) && !state.data?.me.spot;
  useEffect(() => {
    if (!state.data?.on || !placed || naming) return;
    if (!window.localStorage.getItem(INTRO_KEY)) setIntro(true);
  }, [state.data?.on, placed, naming]);

  async function grantSpot(named?: string) {
    let lat: number | null = null;
    let lng: number | null = null;
    const coords = await readCoords();
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
    const spot = (named ?? spotDraft).trim();
    if (!coords && spot.length < 2) {
      setLocPhase("denied");
      return;
    }
    await toggle.mutateAsync({ on: true, spot, lat, lng });
    if (!coords && spot.length < 2) setLocPhase("denied");
    else setLocPhase("ask");
  }

  const data = state.data;
  const card = data?.on ? data.cards[0] : undefined;

  return (
    <main className="flex h-dvh flex-col bg-ink text-paper">
      {state.isPending && !data ? <div className="grid flex-1 place-items-center"><div className="size-16 animate-pulse rounded-full bg-blush-soft" /></div> : null}
      {state.isError ? <p className="px-6 pt-16 text-sm text-muted-foreground">SouLync could not be loaded. Nothing was invented in its place.</p> : null}

      {data && !data.on ? (
        <Splash busy={toggle.isPending} onStart={() => toggle.mutate({ on: true })} />
      ) : null}

      {data?.on && !placed ? (
        locPhase === "denied" ? (
          <DeniedSpot
            spot={spotDraft}
            setSpot={setSpotDraft}
            busy={toggle.isPending}
            onSave={() => grantSpot(spotDraft)}
            onRetry={() => {
              setLocPhase("ask");
              void grantSpot(spotDraft);
            }}
          />
        ) : (
          <AskSpot
            busy={toggle.isPending}
            onYes={() => {
              void (async () => {
                const coords = await readCoords();
                if (!coords) {
                  setLocPhase("denied");
                  return;
                }
                await toggle.mutateAsync({ on: true, lat: coords.lat, lng: coords.lng });
                setLocPhase("name");
              })();
            }}
          />
        )
      ) : null}

      {data?.on && placed && locPhase === "name" && !data.me.spot ? (
        <NameSpot
          spot={spotDraft}
          setSpot={setSpotDraft}
          busy={toggle.isPending}
          onSave={() => toggle.mutate({ on: true, spot: spotDraft.trim() })}
          onSkip={() => setLocPhase("ask")}
        />
      ) : null}

      {data?.on && placed && !(locPhase === "name" && !data.me.spot) ? (
        <>
          <header className="relative flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Link to="/connect" className="relative z-10 text-sm font-medium text-paper/70">Close</Link>
            {tab === "discover" ? (
              <span className="pointer-events-none absolute inset-x-0 flex justify-center"><SparkMark /></span>
            ) : (
              <h1 className="soul-word text-4xl text-brass">{tab === "likes" ? "Likes" : tab === "matches" ? "Matches" : "Profile"}</h1>
            )}
            {tab === "discover" ? (
              <button type="button" aria-label="Refresh deck" className="relative z-10 grid size-11 place-items-center rounded-full text-brass ring-1 ring-brass/40" onClick={() => void refresh()}>
                <RefreshCw className="size-5" />
              </button>
            ) : (
              <span className="size-11" />
            )}
          </header>

          <div className={cn("min-h-0 flex-1 px-4 pt-3", tab === "discover" && !explore ? "overflow-hidden" : "overflow-y-auto")}>
            {tab === "discover" && explore ? (
              <ExploreGrid
                lanes={data.lanes}
                lane={lane}
                onPick={(id) => {
                  setLane(id);
                  setExplore(false);
                }}
              />
            ) : null}
            {tab === "discover" && !explore && card ? (
              <Deck
                card={card}
                busy={swipe.isPending}
                error={error}
                onPass={() => swipe.mutate({ userId: card.userId, direction: "pass" })}
                onLike={(text) => swipe.mutate({ userId: card.userId, direction: "like", note: text })}
                onNote={() => {
                  setNote("");
                  setNoteFor(card);
                }}
              />
            ) : null}
            {tab === "discover" && !explore && !card ? (
              <EmptyPane
                icon={<Sparkles className="size-8 text-brass" />}
                title={lane === "all" ? "No one else is on" : "No one in this lane"}
                body={lane === "all" ? "When another account turns SouLync on, their card shows here." : "This lane only shows people who actually match it. Nothing is filled in."}
                action={<button type="button" className="h-12 rounded-full bg-brass px-5 text-sm font-semibold text-brass-foreground" onClick={() => setExplore(true)}>Open Explore</button>}
              />
            ) : null}
            {tab === "likes" ? (
              <Likes
                incoming={data.likesIn}
                outgoing={data.likesOut}
                busy={swipe.isPending}
                onLike={(person) => swipe.mutate({ userId: person.userId, direction: "like" })}
                onPass={(person) => swipe.mutate({ userId: person.userId, direction: "pass" })}
                onDiscover={() => setTab("discover")}
              />
            ) : null}
            {tab === "matches" ? <Matches rows={data.matches} onDiscover={() => setTab("discover")} /> : null}
            {tab === "profile" && data.on ? (
              <SoulProfile
                me={data.me}
                spot={spotDraft}
                setSpot={setSpotDraft}
                busy={toggle.isPending}
                onSave={() => toggle.mutate({ on: true, spot: spotDraft.trim() })}
                onOff={() => toggle.mutate({ on: false })}
              />
            ) : null}
          </div>

          {tab === "discover" ? (
            <div className="flex justify-center gap-2 px-4 pb-2">
              <button type="button" className={cn("h-9 rounded-full px-4 text-sm font-semibold", !explore ? "bg-brass text-brass-foreground" : "text-paper/70 ring-1 ring-paper/20")} onClick={() => setExplore(false)}>Deck</button>
              <button type="button" className={cn("h-9 rounded-full px-4 text-sm font-semibold", explore ? "bg-brass text-brass-foreground" : "text-paper/70 ring-1 ring-paper/20")} onClick={() => setExplore(true)}>Explore</button>
            </div>
          ) : null}

          <nav className="grid grid-cols-4 border-t border-paper/15 pb-[env(safe-area-inset-bottom)]" aria-label="SouLync">
            <TabButton on={tab === "discover"} label="Discover" onClick={() => setTab("discover")}>
              <span className={cn("soul-word text-3xl", tab === "discover" ? "text-brass" : "text-paper/40")}>S</span>
            </TabButton>
            <TabButton on={tab === "likes"} label="Likes" onClick={() => setTab("likes")}>
              <Heart className={cn("size-6", tab === "likes" ? "fill-brass text-brass" : "text-paper/40")} />
              {data.likesIn.length ? <span className="absolute top-2 right-6 grid min-w-4 place-items-center rounded-full bg-brass px-1 text-[10px] font-semibold text-brass-foreground">{data.likesIn.length}</span> : null}
            </TabButton>
            <TabButton on={tab === "matches"} label="Matches" onClick={() => setTab("matches")}>
              <MessageCircle className={cn("size-6", tab === "matches" ? "text-brass" : "text-paper/40")} />
            </TabButton>
            <TabButton on={tab === "profile"} label="Profile" onClick={() => setTab("profile")}>
              {data.me.photo ? <img src={data.me.photo} alt="" className={cn("size-7 rounded-full object-cover", tab === "profile" ? "ring-2 ring-brass" : "")} /> : <UserRound className={cn("size-6", tab === "profile" ? "text-brass" : "text-paper/40")} />}
            </TabButton>
          </nav>
        </>
      ) : null}

      {intro ? (
        <Sheet>
          <div className="mx-auto grid size-28 place-items-center rounded-full bg-ink text-brass ring-1 ring-brass/40">
            <Lock className="size-10" />
          </div>
          <h2 className="soul-word mt-6 text-center text-5xl text-ink">Private, and mutual</h2>
          <p className="mt-3 text-center text-sm text-muted-foreground">Like a card, or leave a note. A match happens only when you both say yes, and that note is the first message.</p>
          <button
            type="button"
            className="mt-6 h-14 w-full rounded-full bg-brass text-base font-semibold text-brass-foreground"
            onClick={() => {
              window.localStorage.setItem(INTRO_KEY, "1");
              setIntro(false);
            }}
          >
            I understand
          </button>
        </Sheet>
      ) : null}

      {noteFor ? (
        <Sheet>
          <h2 className="soul-word text-4xl text-ink">A note for {noteFor.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sent only if you like them. If they like you back, this is the first message in the chat.</p>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} aria-label="Note" placeholder="Say what caught you" className="mt-4 min-h-28 w-full rounded-2xl bg-secondary p-4 text-sm outline-none" />
          <button type="button" className="mt-4 h-14 w-full rounded-full bg-brass text-base font-semibold text-brass-foreground" onClick={() => swipe.mutate({ userId: noteFor.userId, direction: "like", note })}>Send like</button>
          <button type="button" className="mt-2 h-12 w-full text-sm font-medium text-muted-foreground" onClick={() => setNoteFor(null)}>Cancel</button>
        </Sheet>
      ) : null}

      {match ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink px-6 text-center text-paper">
          <div>
            <p className="text-xs tracking-[0.22em] text-brass uppercase">Mutual</p>
            <p className="soul-word mt-3 text-7xl text-brass">It's a match</p>
            <p className="mt-3 text-base text-paper/80">You and {match.name} (@{match.handle}) both said yes.</p>
            <div className="mt-8 flex justify-center gap-4">
              <Face photo={data?.on ? data.me.photo : ""} name="You" />
              <Face photo={match.photo} name={match.name} />
            </div>
            <Link to="/messages/$id" params={{ id: match.threadId }} className="mt-8 flex h-14 items-center justify-center rounded-full bg-brass text-base font-semibold text-brass-foreground">Open the chat</Link>
            <button type="button" className="mt-3 h-12 w-full text-sm font-semibold text-paper/70" onClick={() => setMatch(null)}>Keep looking</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SparkMark() {
  return (
    <span className="soul-word text-5xl text-brass">SouLync</span>
  );
}

function Splash({ busy, onStart }: { busy: boolean; onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col bg-ink px-6 pb-8 text-paper">
      <div className="flex items-center justify-between pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/connect" className="text-sm font-medium text-paper/70">Close</Link>
        <Lock className="size-5 text-brass" />
      </div>
      <div className="grid flex-1 place-items-center text-center">
        <div>
          <p className="text-xs tracking-[0.28em] text-brass uppercase">Discreet</p>
          <p className="soul-word mt-3 text-8xl text-brass">SouLync</p>
          <p className="mx-auto mt-4 max-w-xs text-sm text-paper/75">Only people who turn this on show up. A match is when you both say yes. No one else is added.</p>
        </div>
      </div>
      <button type="button" disabled={busy} className="h-14 w-full rounded-full bg-brass text-base font-semibold text-brass-foreground" onClick={onStart}>Turn it on</button>
    </div>
  );
}

function AskSpot({ busy, onYes }: { busy: boolean; onYes: () => void }) {
  return (
    <div className="flex flex-1 flex-col bg-paper px-6 pb-8 text-ink">
      <Link to="/connect" className="pt-[max(0.75rem,env(safe-area-inset-top))] text-sm font-medium text-muted-foreground">Close</Link>
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="soul-word text-6xl leading-none text-ink">Your spot stays private until you share it.</h1>
        <p className="mt-4 text-sm text-muted-foreground">Distance only appears when both of you share a location. If you skip it, name a campus or city instead. No one is invented nearby.</p>
      </div>
      <button type="button" disabled={busy} className="h-14 w-full rounded-full bg-brass text-base font-semibold text-brass-foreground" onClick={onYes}>Allow location</button>
    </div>
  );
}

function DeniedSpot({
  spot,
  setSpot,
  busy,
  onSave,
  onRetry,
}: {
  spot: string;
  setSpot: (value: string) => void;
  busy: boolean;
  onSave: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col bg-paper px-6 pb-8 text-ink">
      <div className="flex items-center justify-between pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/connect" className="text-sm font-medium text-muted-foreground">Close</Link>
        <SparkMark />
        <span className="size-11" />
      </div>
      <div className="grid flex-1 place-items-center text-center">
        <div>
          <div className="relative mx-auto grid size-28 place-items-center">
            <span className="absolute inset-0 rounded-full bg-brass/15" />
            <TriangleAlert className="relative size-14 text-brass-foreground" />
          </div>
          <h1 className="soul-word mt-6 text-5xl text-ink">We need your spot</h1>
          <p className="mt-2 text-sm text-muted-foreground">Location stayed off. Name a campus or city so same-spot Explore is real.</p>
          <input value={spot} onChange={(event) => setSpot(event.target.value)} aria-label="Your spot" placeholder="Campus or city" className="mt-4 h-12 w-full rounded-full bg-secondary px-4 text-sm outline-none" />
        </div>
      </div>
      <button type="button" disabled={busy || spot.trim().length < 2} className="h-14 w-full rounded-full bg-brass text-base font-semibold text-brass-foreground" onClick={onSave}>Save my spot</button>
      <button type="button" className="mt-3 h-11 text-sm font-medium text-ink" onClick={onRetry}>Try location again</button>
    </div>
  );
}

function NameSpot({
  spot,
  setSpot,
  busy,
  onSave,
  onSkip,
}: {
  spot: string;
  setSpot: (value: string) => void;
  busy: boolean;
  onSave: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col bg-paper px-6 pb-8 text-ink">
      <Link to="/connect" className="pt-[max(0.75rem,env(safe-area-inset-top))] text-sm font-medium text-muted-foreground">Close</Link>
      <div className="flex flex-1 flex-col justify-center">
        <MapPin className="size-8 text-brass" />
        <h1 className="soul-word mt-4 text-6xl text-ink">Name your spot</h1>
        <p className="mt-3 text-sm text-muted-foreground">Location is on, so distance can show. A name puts you in the same-spot lane with people who typed the same place.</p>
        <input value={spot} onChange={(event) => setSpot(event.target.value)} aria-label="Spot name" placeholder="Campus or city" className="mt-5 h-12 rounded-full bg-secondary px-4 text-sm outline-none" />
      </div>
      <button type="button" disabled={busy || spot.trim().length < 2} className="h-14 w-full rounded-full bg-brass text-base font-semibold text-brass-foreground" onClick={onSave}>Save my spot</button>
      <button type="button" className="mt-3 h-11 text-sm font-medium text-muted-foreground" onClick={onSkip}>Not now</button>
    </div>
  );
}

function Deck({
  card,
  busy,
  error,
  onPass,
  onLike,
  onNote,
}: {
  card: Card;
  busy: boolean;
  error: string;
  onPass: () => void;
  onLike: (note?: string) => void;
  onNote: () => void;
}) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [fly, setFly] = useState(0);
  const start = useRef({ x: 0, y: 0 });
  const lock = useRef(false);
  const x = fly ? fly * 520 : drag.x;

  function finish(direction: "like" | "pass") {
    if (lock.current || busy) return;
    lock.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFly(direction === "like" ? 1 : -1);
    window.setTimeout(() => {
      if (direction === "like") onLike();
      else onPass();
      setFly(0);
      setDrag({ x: 0, y: 0 });
      lock.current = false;
    }, reduced ? 0 : 180);
  }

  const chips = card.interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3);

  return (
    <div className="flex h-full flex-col">
      <article
        className="relative min-h-0 flex-1 touch-none overflow-hidden rounded-3xl bg-secondary shadow-soft"
        onPointerDown={(event) => {
          if (busy) return;
          start.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId) || lock.current) return;
          setDrag({ x: event.clientX - start.current.x, y: event.clientY - start.current.y });
        }}
        onPointerUp={(event) => {
          if (lock.current) return;
          const dx = event.clientX - start.current.x;
          if (dx > 96) finish("like");
          else if (dx < -96) finish("pass");
          else setDrag({ x: 0, y: 0 });
        }}
        onPointerCancel={() => setDrag({ x: 0, y: 0 })}
        style={{ transform: `translate(${x}px, ${drag.y * 0.2}px) rotate(${x / 18}deg)`, transition: fly || drag.x === 0 ? "transform 180ms ease" : "none" }}
      >
        {card.photo ? <img src={card.photo} alt="" className="absolute inset-0 size-full object-cover" /> : (
          <div className="absolute inset-0 grid place-items-center bg-ink"><span className="soul-word text-8xl text-brass">{card.name.slice(0, 1)}</span></div>
        )}
        <div className={cn("soul-word absolute top-6 left-6 rounded-md border border-brass px-3 py-1 text-4xl text-brass", x > 36 ? "opacity-100" : "opacity-0")}>Yes</div>
        <div className={cn("soul-word absolute top-6 right-6 rounded-md border border-paper px-3 py-1 text-4xl text-paper", x < -36 ? "opacity-100" : "opacity-0")}>Pass</div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-5 text-paper">
          <h2 className="soul-word text-5xl">{card.name}</h2>
          <p className="text-sm text-paper/80">@{card.handle}{card.km != null ? ` · ${card.km} km` : ""}{card.spot ? ` · ${card.spot}` : ""}</p>
          {card.bio ? <p className="mt-2 line-clamp-3 text-sm">{card.bio}</p> : null}
          {chips.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => <span key={chip} className="rounded-full bg-paper/15 px-3 py-1 text-xs">{chip}</span>)}
            </div>
          ) : null}
        </div>
      </article>
      {error ? <p className="mt-2 text-center text-sm text-brass">{error}</p> : null}
      <div className="mt-3 flex items-center justify-center gap-4">
        <RoundButton label="Pass" onClick={() => finish("pass")} className="size-16 text-paper ring-1 ring-paper/30"><X className="size-7" /></RoundButton>
        <RoundButton label="Leave a note" onClick={onNote} className="size-12 text-brass ring-1 ring-brass/50"><MessageCircle className="size-5" /></RoundButton>
        <RoundButton label="Like" onClick={() => finish("like")} className="size-16 bg-brass text-brass-foreground"><Heart className="size-7 fill-brass-foreground" /></RoundButton>
      </div>
    </div>
  );
}

function ExploreGrid({
  lanes,
  lane,
  onPick,
}: {
  lanes: Array<{ id: Lane; label: string; count: number }>;
  lane: Lane;
  onPick: (id: Lane) => void;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Lanes only count people who turned SouLync on and match the words on their profile.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {lanes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item.id)}
            className={cn(
              "flex h-36 flex-col items-start justify-end rounded-3xl p-4 text-left ring-1",
              item.id === "night" || item.id === "all" ? "bg-brass text-brass-foreground ring-brass" : "bg-paper/8 text-paper ring-paper/15",
              lane === item.id ? "ring-2 ring-brass" : "",
            )}
          >
            <span className="soul-word text-4xl">{item.label}</span>
            <span className="text-sm opacity-80">{item.count} {item.count === 1 ? "person" : "people"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Likes({
  incoming,
  outgoing,
  busy,
  onLike,
  onPass,
  onDiscover,
}: {
  incoming: Card[];
  outgoing: Card[];
  busy: boolean;
  onLike: (card: Card) => void;
  onPass: (card: Card) => void;
  onDiscover: () => void;
}) {
  if (!incoming.length && !outgoing.length) {
    return (
      <EmptyPane
        icon={<Heart className="size-8 text-brass" />}
        title="No likes yet"
        body="People who like you show up here, and so do likes you send. Both are real accounts only."
        action={<button type="button" className="h-12 rounded-full bg-brass px-5 text-sm font-semibold text-brass-foreground" onClick={onDiscover}>Discover</button>}
      />
    );
  }
  return (
    <div className="space-y-6 pb-4">
      {incoming.length ? (
        <section>
          <h2 className="soul-word text-4xl text-brass">Liked you</h2>
          <ul className="mt-3 space-y-3">
            {incoming.map((person) => (
              <li key={person.userId} className="flex items-center gap-3 rounded-3xl bg-paper/8 p-3">
                <Face photo={person.photo} name={person.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{person.handle}{person.note ? ` · “${person.note}”` : ""}</p>
                </div>
                <button type="button" aria-label={`Pass ${person.name}`} disabled={busy} className="grid size-11 place-items-center rounded-full text-paper ring-1 ring-paper/30" onClick={() => onPass(person)}><X className="size-5" /></button>
                <button type="button" aria-label={`Like ${person.name}`} disabled={busy} className="grid size-11 place-items-center rounded-full bg-brass text-brass-foreground" onClick={() => onLike(person)}><Heart className="size-5 fill-brass-foreground" /></button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {outgoing.length ? (
        <section>
          <h2 className="soul-word text-4xl text-brass">You liked</h2>
          <ul className="mt-3 space-y-3">
            {outgoing.map((person) => (
              <li key={person.userId} className="flex items-center gap-3">
                <Face photo={person.photo} name={person.name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{person.handle}{person.note ? " · note sent" : " · waiting on them"}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Matches({ rows, onDiscover }: { rows: Array<Card & { threadId: string }>; onDiscover: () => void }) {
  if (!rows.length) {
    return (
      <EmptyPane
        icon={<MessageCircle className="size-8 text-brass" />}
        title="Your first match is waiting"
        body="Like someone. When it’s mutual, the conversation shows up here."
        action={<button type="button" className="h-12 w-full max-w-xs rounded-full bg-brass text-sm font-semibold text-brass-foreground" onClick={onDiscover}>Discover new members</button>}
      />
    );
  }
  return (
    <ul className="space-y-3 pb-4">
      {rows.map((person) => (
        <li key={person.userId}>
          <Link to="/messages/$id" params={{ id: person.threadId }} className="flex items-center gap-3 rounded-3xl bg-paper/8 p-3">
            <Face photo={person.photo} name={person.name} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{person.name}</p>
              <p className="truncate text-xs text-muted-foreground">@{person.handle} · Open the chat</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SoulProfile({
  me,
  spot,
  setSpot,
  busy,
  onSave,
  onOff,
}: {
  me: { name: string; handle: string; photo: string; bio: string; institution: string; interests: string; spot: string; pinned: boolean };
  spot: string;
  setSpot: (value: string) => void;
  busy: boolean;
  onSave: () => void;
  onOff: () => void;
}) {
  const chips = me.interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 6);
  return (
    <div className="pb-6 text-center">
      <div className="flex justify-end">
        <Link to="/communities" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-paper ring-1 ring-paper/20">Communities</Link>
      </div>
      <div className="mx-auto mt-2">
        <Face photo={me.photo} name={me.name} large />
      </div>
      <h2 className="soul-word mt-4 text-5xl text-brass">{me.name}</h2>
      <p className="text-sm text-muted-foreground">@{me.handle}{me.institution ? ` · ${me.institution}` : ""}</p>
      <p className="mt-1 text-sm text-muted-foreground">{me.pinned ? "Location is on" : "Location is off"}{me.spot ? ` · ${me.spot}` : ""}</p>
      {me.bio ? <p className="mx-auto mt-4 max-w-sm text-sm">{me.bio}</p> : <p className="mt-4 text-sm text-muted-foreground">No biography yet. It comes from your Connect profile.</p>}
      {chips.length ? <div className="mt-4 flex flex-wrap justify-center gap-2">{chips.map((chip) => <span key={chip} className="rounded-full bg-brass/15 px-3 py-1 text-xs font-medium text-brass">{chip}</span>)}</div> : null}
      <label className="mt-6 block text-left text-sm font-medium">Spot name</label>
      <input value={spot} onChange={(event) => setSpot(event.target.value)} aria-label="Spot name" className="mt-2 h-12 w-full rounded-full bg-paper/10 px-4 text-sm text-paper outline-none ring-1 ring-paper/15" />
      <button type="button" disabled={busy} className="mt-3 h-12 w-full rounded-full bg-brass text-sm font-semibold text-brass-foreground" onClick={onSave}>Save spot</button>
      <Link to="/profile" className="mt-3 flex h-12 items-center justify-center rounded-full text-sm font-semibold text-paper ring-1 ring-paper/25">Edit profile</Link>
      <button type="button" className="mt-4 text-sm text-muted-foreground" onClick={onOff}>Turn SouLync off</button>
    </div>
  );
}

function EmptyPane({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-96 place-items-center px-4 text-center">
      <div className="max-w-xs">
        <div className="mx-auto grid size-24 place-items-center rounded-full bg-brass/15 text-brass">{icon}</div>
        <h2 className="soul-word mt-5 text-5xl text-brass">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

function Face({ photo, name, large }: { photo: string; name: string; large?: boolean }) {
  const size = large ? "size-28 text-4xl" : "size-14 text-lg";
  if (photo) return <img src={photo} alt="" className={cn("rounded-full object-cover", size)} />;
  return <span className={cn("grid place-items-center rounded-full bg-brass/20 font-medium text-brass", size)}>{name.slice(0, 1)}</span>;
}

function TabButton({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} aria-current={on ? "page" : undefined} onClick={onClick} className="relative grid h-16 place-items-center">
      {children}
    </button>
  );
}

function RoundButton({ label, onClick, className, children }: { label: string; onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cn("grid place-items-center rounded-full", className)}>
      {children}
    </button>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 grid items-end bg-ink/50">
      <div className="rounded-t-3xl bg-paper px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink">{children}</div>
    </div>
  );
}

function readCoords() {
  return new Promise<{ lat: number; lng: number } | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  });
}
