import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/unibud/person";
import { RelationActions } from "@/components/unibud/relation-actions";
import { getProfileByHandle } from "@/lib/social/people.server";
import { personByHandle, uniById, COMMUNITIES, POSTS, type DirectoryPerson } from "@/lib/unibud/catalog";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { roleLabel } from "@/lib/unibud/roles";
import { academicLine, canViewAcademic, sharedContext, type CampusLens } from "@/lib/unibud/identity";
import { tagLabel } from "@/lib/unibud/identity-tags";
import { relativeTime } from "@/lib/unibud/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/u/$handle")({ component: PublicProfile });

function PublicProfile() {
  const { handle } = Route.useParams();
  // Real account profile (server) — seeded personas fall back to the catalog.
  const real = useQuery({
    queryKey: ["public-profile", handle],
    queryFn: () => getProfileByHandle({ data: handle }),
  });
  const realPerson: DirectoryPerson | null = real.data
    ? {
        handle: real.data.handle,
        name: real.data.name,
        universityId: real.data.universityId,
        program: real.data.program,
        year: real.data.year,
        bio: real.data.bio,
        verified: false,
      }
    : null;
  const person = personByHandle(handle) ?? realPerson;
  const connections = useCampusStore((s) => s.connections);
  const following = useCampusStore((s) => s.following);
  const homeCampusId = useCampusStore((s) => s.homeCampusId);
  const faculty = useCampusStore((s) => s.faculty);
  const department = useCampusStore((s) => s.department);
  const [ctx, setCtx] = useState<"social" | "academic">("social");

  if (!person) {
    return (
      <main className="px-5 py-12">
        <p className="text-sm text-muted-foreground">No student with that username.</p>
        <Link to="/connect" className="mt-4 inline-block text-sm font-medium">
          Back to Connect
        </Link>
      </main>
    );
  }

  const uni = uniById(person.universityId);
  const role = person.role ?? "student";
  const lens: CampusLens = {
    universityId: homeCampusId || "unilag",
    program: "Computer Engineering",
    year: "300",
    faculty,
    department,
  };
  const shared = sharedContext(person, lens);
  const connected = connections.includes(person.handle);
  const followingThem = following.includes(person.handle);
  const posts = POSTS.filter((p) => p.authorHandle === person.handle);
  const sameCampus = person.universityId === (homeCampusId || "unilag");
  const canSeeAcademic = canViewAcademic({
    connected,
    following: followingThem,
    sameCampus,
    visibility: "connections",
  });

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Student</p>
      <div className="mt-4 flex items-start gap-4">
        <Avatar name={person.name} className="size-16 text-lg rounded-2xl" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl">
            {person.name}
            {person.verified ? <BadgeCheck className="ml-1 inline size-4 text-bud" /> : null}
          </h1>
          <p className="text-sm text-muted-foreground">@{person.handle}</p>
          {ctx === "social" && person.tags?.length ? (
            <p className="mt-1 text-xs text-muted-foreground">{person.tags.map(tagLabel).join(" · ")}</p>
          ) : null}
        </div>
      </div>
      {ctx === "social" ? <p className="mt-4 text-sm leading-relaxed">{person.bio}</p> : null}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setCtx("social")}
          className={cn(
            "h-9 rounded-full px-4 text-sm",
            ctx === "social" ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
          )}
        >
          Social
        </button>
        <button
          type="button"
          onClick={() => setCtx("academic")}
          className={cn(
            "h-9 rounded-full px-4 text-sm",
            ctx === "academic" ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
          )}
        >
          Academic
        </button>
      </div>
      <div className="mt-5">
        <RelationActions handle={person.handle} />
      </div>

      {ctx === "social" ? (
        <>
          {posts.length ? (
            <section className="mt-8">
              <h2 className="text-sm font-medium">Posts</h2>
              <ul className="mt-2 space-y-2">
                {posts.map((p) => {
                  const community = COMMUNITIES.find((c) => c.id === p.communityId);
                  return (
                    <li key={p.id} className="rounded-xl bg-card p-3 ring-1 ring-border">
                      <p className="text-sm">{p.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {community?.name} · {relativeTime(p.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      ) : canSeeAcademic ? (
        <>
          <p className="mt-4 text-xs font-medium">{roleLabel(role, person.program)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{academicLine(person)}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <dt className="text-xs text-muted-foreground">Campus</dt>
              <dd className="mt-1 font-medium">{uni?.shortName ?? "—"}</dd>
            </div>
            <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <dt className="text-xs text-muted-foreground">Faculty</dt>
              <dd className="mt-1 font-medium">{person.faculty ?? "—"}</dd>
            </div>
            <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <dt className="text-xs text-muted-foreground">Department</dt>
              <dd className="mt-1 font-medium">{person.department ?? "—"}</dd>
            </div>
            <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <dt className="text-xs text-muted-foreground">Programme · Level</dt>
              <dd className="mt-1 font-medium">
                {person.program} · {person.year}
              </dd>
            </div>
          </dl>
          {shared.rooms.length ? (
            <section className="mt-8">
              <h2 className="text-sm font-medium">Shared campus spaces</h2>
              <ul className="mt-2 space-y-2">
                {shared.rooms.map((c) => (
                  <li key={c.id}>
                    <Link to="/communities/$id" params={{ id: c.id }} className="text-sm text-bud">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Academic details stay with connections and classmates. Connect to see more. Following is not enough.
        </p>
      )}
    </main>
  );
}
