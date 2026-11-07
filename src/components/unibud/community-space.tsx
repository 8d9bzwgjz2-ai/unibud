import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/unibud/person";
import { PhotoPlate } from "@/components/unibud/photo-plate";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import { communityById, personByHandle } from "@/lib/unibud/catalog";
import { relativeTime } from "@/lib/unibud/format";
import { useCatalog } from "@/lib/unibud/queries";
import { createPost, joinCommunity, myCommunities } from "@/lib/social/server";
import { COMMUNITY_META, communityKindCopy, communityKindLabel } from "@/lib/unibud/community-meta";
import { canGovernClass, canModerateCommunity, canTeach } from "@/lib/unibud/roles";
import { useCampusStore } from "@/lib/unibud/campus-store";

export function CommunitySpace({ id }: { id: string }) {
  const { data, refetch } = useCatalog();
  const { user } = useAuthReady();
  const qc = useQueryClient();
  const role = useCampusStore((s) => s.role ?? "student");
  const community = data?.communities.find((c) => c.id === id) ?? communityById(id);
  const posts = (data?.posts ?? []).filter((p) => p.communityId === id);
  const joined = useQuery({
    queryKey: ["my-communities"],
    queryFn: () => myCommunities(),
    enabled: Boolean(user),
  });
  const isIn = joined.data?.includes(id);
  const [body, setBody] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const meta = COMMUNITY_META[id];
  const isClass = community?.kind === "Class";
  const isStudy = community?.kind === "Study";
  const governorHere = isClass && canGovernClass(role);
  const moderatorHere = Boolean(meta?.moderatorHandles) && canModerateCommunity(role);
  const spills = useCampusStore((s) => s.spills);
  const flagged = useCampusStore((s) => s.flaggedSpills);
  const communitySpills = spills.filter((x) => x.communityId === id && !flagged.includes(x.id));

  const joinMut = useMutation({
    mutationFn: () => joinCommunity({ data: id }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["my-communities"] }),
  });
  const postMut = useMutation({
    mutationFn: () => createPost({ data: { communityId: id, body } }),
    onSuccess: () => {
      setBody("");
      toast.success("Posted");
      void refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!community) return <main className="px-4 py-16">Community not found.</main>;

  return (
    <main className="safe-bottom px-4 pb-8 md:px-6">
      <PhotoPlate
        src={community.cover}
        alt=""
        tone="night"
        title={community.name}
        className="mt-2 h-40 rounded-3xl"
      />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{communityKindLabel(community.kind)}</p>
          <h1 className="text-2xl font-medium tracking-tight">{community.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{community.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">{communityKindCopy(community.kind)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{community.members.toLocaleString()} members</p>
        </div>
        {user ? (
          <Button size="sm" variant={isIn ? "outline" : "primary"} onClick={() => joinMut.mutate()}>
            {isIn ? "Joined" : "Join"}
          </Button>
        ) : null}
      </div>

      {meta?.chatId ? (
        <Link
          to="/messages/$id"
          params={{ id: meta.chatId }}
          className="mt-4 inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-medium"
        >
          Open {isClass ? "class" : isStudy ? "study" : "community"} chat
        </Link>
      ) : null}
      {communitySpills.length ? (
        <Link to="/riff" className="mt-3 block text-sm font-medium text-bud">
          {communitySpills.length} Riff{communitySpills.length === 1 ? "" : "s"} from this room
        </Link>
      ) : null}

      {governorHere ? (
        <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
          <p className="text-xs font-semibold tracking-wide uppercase">Class governor</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Coordination only. This is not Tutor Mode and not lecturer attendance.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/communities/$id"
              params={{ id: "night-study" }}
              className="inline-flex h-9 items-center rounded-full bg-secondary px-3 text-sm"
            >
              Organise a study group
            </Link>
            {meta?.chatId ? (
              <Link
                to="/messages/$id"
                params={{ id: meta.chatId }}
                className="inline-flex h-9 items-center rounded-full bg-secondary px-3 text-sm"
              >
                Class chat
              </Link>
            ) : null}
          </div>
          <Textarea
            className="mt-3"
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Class announcement"
          />
          <Button
            className="mt-2"
            size="sm"
            variant="outline"
            disabled={!announcement.trim()}
            onClick={() => {
              toast.success("Announcement noted for the class (demo).");
              setAnnouncement("");
            }}
          >
            Publish update
          </Button>
        </section>
      ) : null}

      {canTeach(role) && isClass ? (
        <p className="mt-4 text-sm">
          <Link to="/tutor" className="font-medium">
            Start a live class in Tutor Mode
          </Link>
          <span className="text-muted-foreground"> — teaching is not a Square post.</span>
        </p>
      ) : null}

      {moderatorHere ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Community moderator tools stay in this space. They are not class governor or lecturer privileges.
        </p>
      ) : null}

      {meta?.announcements?.length ? (
        <section className="mt-6">
          <h2 className="text-sm font-medium">Announcements</h2>
          <ul className="mt-2 space-y-2">
            {meta.announcements.map((a) => (
              <li key={a.id} className="rounded-2xl bg-secondary p-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {a.by} · {relativeTime(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {user && isIn ? (
        <form
          className="mt-5 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            postMut.mutate();
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isClass ? "Class discussion" : isStudy ? "Study note" : "Share with the room"}
          />
          <Button type="submit" size="sm" disabled={postMut.isPending}>
            Post
          </Button>
        </form>
      ) : null}

      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-medium">Discussions</h2>
        {posts.map((p) => {
          const person = personByHandle(p.authorHandle);
          return (
            <article key={p.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex items-center gap-2">
                <Avatar name={person?.name ?? p.authorHandle} className="size-8" />
                <div>
                  <p className="text-sm font-medium">{person?.name ?? p.authorHandle}</p>
                  <p className="text-xs text-muted-foreground">{relativeTime(p.createdAt)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{p.body}</p>
            </article>
          );
        })}
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No discussions in this space yet.</p>
        ) : null}
      </div>
    </main>
  );
}
