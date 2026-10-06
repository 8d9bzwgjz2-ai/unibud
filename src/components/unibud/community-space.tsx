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
import {
  createQuadGroup,
  joinQuadGroup,
  myQuadGroups,
  postQuadAnnouncement,
} from "@/lib/unibud/quad.server";
import { COMMUNITY_META, communityKindCopy, communityKindLabel } from "@/lib/unibud/community-meta";
import { canGovernClass, canModerateCommunity, canTeach } from "@/lib/unibud/roles";
import { useCampusStore } from "@/lib/unibud/campus-store";

export function CommunitySpace({ id }: { id: string }) {
  const { data, refetch } = useCatalog();
  const { user } = useAuthReady();
  const qc = useQueryClient();
  const role = useCampusStore((s) => s.role ?? "student");
  const community = data?.communities.find((c) => c.id === id) ?? communityById(id);
  const allQuadPosts = (data?.posts ?? []).filter((p) => p.communityId === id);
  const groups = (data?.quadGroups ?? []).filter((g) => g.quadId === id);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const posts = selectedGroup
    ? allQuadPosts.filter((p) => p.groupId === selectedGroup)
    : allQuadPosts;
  const joined = useQuery({
    queryKey: ["my-communities"],
    queryFn: () => myCommunities(),
    enabled: Boolean(user),
  });
  const isIn = joined.data?.includes(id);
  const [body, setBody] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [groupName, setGroupName] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const meta = COMMUNITY_META[id];
  const isClass = community?.kind === "Class";
  const isStudy = community?.kind === "Study";
  const governorHere = isClass && canGovernClass(role);
  const moderatorHere = Boolean(meta?.moderatorHandles) && canModerateCommunity(role);
  // Real permission: the Quad's creator manages its groups; class spaces keep
  // the existing governor rule.
  const creatorHere = Boolean(user && community?.createdBy === user.id);
  const canManageGroups = creatorHere || governorHere || moderatorHere;
  const myGroups = useQuery({
    queryKey: ["my-quad-groups"],
    queryFn: () => myQuadGroups(),
    enabled: Boolean(user),
  });
  const spills = useCampusStore((s) => s.spills);
  const flagged = useCampusStore((s) => s.flaggedSpills);
  const communitySpills = spills.filter((x) => x.communityId === id && !flagged.includes(x.id));

  const joinMut = useMutation({
    mutationFn: () => joinCommunity({ data: id }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["my-communities"] }),
  });
  const postMut = useMutation({
    mutationFn: () =>
      createPost({ data: { communityId: id, body, groupId: selectedGroup ?? undefined } }),
    onSuccess: () => {
      setBody("");
      toast.success("Posted");
      void refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const createGroupMut = useMutation({
    mutationFn: () => createQuadGroup({ data: { quadId: id, name: groupName } }),
    onSuccess: () => {
      setGroupName("");
      setShowGroupForm(false);
      void refetch();
      toast.success("Group opened inside the Quad.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const joinGroupMut = useMutation({
    mutationFn: (groupId: string) => joinQuadGroup({ data: groupId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["my-quad-groups"] }),
  });
  const announceMut = useMutation({
    mutationFn: () => postQuadAnnouncement({ data: { quadId: id, body: announcement } }),
    onSuccess: () => {
      setAnnouncement("");
      void refetch();
      toast.success("Announcement published.");
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

      {canManageGroups ? (
        <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
          <p className="text-xs font-semibold tracking-wide uppercase">
            {creatorHere ? "Your Quad" : "Class governor"}
          </p>
          {isClass ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Coordination only. This is not Tutor Mode and not lecturer attendance.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {isClass ? (
              <Link
                to="/communities/$id"
                params={{ id: "night-study" }}
                className="inline-flex h-9 items-center rounded-full bg-secondary px-3 text-sm"
              >
                Organise a study group
              </Link>
            ) : null}
            {meta?.chatId ? (
              <Link
                to="/messages/$id"
                params={{ id: meta.chatId }}
                className="inline-flex h-9 items-center rounded-full bg-secondary px-3 text-sm"
              >
                {isClass ? "Class" : "Quad"} chat
              </Link>
            ) : null}
          </div>
          <Textarea
            className="mt-3"
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder={isClass ? "Class announcement" : "Announcement for the Quad"}
          />
          <Button
            className="mt-2"
            size="sm"
            variant="outline"
            disabled={!announcement.trim() || announceMut.isPending}
            onClick={() => announceMut.mutate()}
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

      {(data?.quadAnnouncements ?? []).filter((a) => a.quadId === id).length ? (
        <section className="mt-6">
          <h2 className="text-sm font-medium">Announcements</h2>
          <ul className="mt-2 space-y-2">
            {(data?.quadAnnouncements ?? [])
              .filter((a) => a.quadId === id)
              .map((a) => (
                <li key={a.id} className="rounded-2xl bg-secondary p-3">
                  <p className="text-sm leading-relaxed">{a.body}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    by {personByHandle(a.authorHandle)?.name ?? a.authorHandle} ·{" "}
                    {relativeTime(a.createdAt)}
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
