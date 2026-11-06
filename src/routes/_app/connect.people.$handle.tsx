import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Avatar } from "@/components/unibud/person";
import { EmptyState } from "@/components/unibud/empty";
import {
  blockPerson,
  followPerson,
  getConnectPerson,
  reportPerson,
  requestConnection,
  respondConnection,
  unblockPerson,
  unfollowPerson,
} from "@/lib/connect/server";
import { MessageLink } from "@/components/unibud/message-link";

export const Route = createFileRoute("/_app/connect/people/$handle")({ component: Person });

const REPORTS = ["Spam", "Harassment", "Fake profile", "Something else"];

function Person() {
  const { handle } = Route.useParams();
  const qc = useQueryClient();
  const [report, setReport] = useState("");
  const [note, setNote] = useState("");
  const person = useQuery({
    queryKey: ["connect-person", handle],
    queryFn: () => getConnectPerson({ data: { handle } }),
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["connect-person", handle] });
    await qc.invalidateQueries({ queryKey: ["connect-relations"] });
    await qc.invalidateQueries({ queryKey: ["connect-search"] });
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const run = useMutation({
    mutationFn: async (action: "follow" | "unfollow" | "connect" | "block" | "unblock" | "report") => {
      if (!person.data?.ok) return { ok: false as const, error: "This profile is not available." };
      const userId = "userId" in person.data.profile ? person.data.profile.userId : "";
      if (action === "follow") return followPerson({ data: { userId } });
      if (action === "unfollow") return unfollowPerson({ data: { userId } });
      if (action === "connect") return requestConnection({ data: { userId } });
      if (action === "block") return blockPerson({ data: { userId } });
      if (action === "unblock") return unblockPerson({ data: { userId } });
      return reportPerson({ data: { userId, category: report, note } });
    },
    onSuccess: async (result) => {
      if (!result.ok) setNote(result.error);
      else setNote(report ? "Report sent. The other person is not told who reported them." : "");
      await refresh();
    },
  });

  if (person.isPending) return <div className="m-5 h-40 animate-pulse rounded-3xl bg-secondary" />;
  if (!person.data?.ok) {
    return (
      <main className="safe-bottom px-5 pt-6">
        <EmptyState title="Profile unavailable" body={person.data?.error ?? "This profile could not be loaded."} action={<Link to="/connect" className="text-sm font-medium">Back to Connect</Link>} />
      </main>
    );
  }
  const profile = person.data.profile;
  return (
    <main className="safe-bottom px-5 pt-6">
      <Link to="/connect" className="text-sm text-muted-foreground">Connect</Link>
      <div className="mt-4 flex items-center gap-3">
        <Avatar name={profile.displayName || profile.handle} className="size-16 text-base" />
        <div>
          <h1 className="font-display text-3xl">{profile.displayName || profile.handle}</h1>
          <p className="text-sm text-muted-foreground">@{profile.handle}{profile.verified ? " · Verified" : ""}</p>
        </div>
      </div>
      {profile.bio ? <p className="mt-4 text-sm leading-relaxed">{profile.bio}</p> : null}
      {!person.data.self && person.data.requestStatus === "pending" && !person.data.requestFromMe ? (
        <p className="mt-4 text-sm font-medium">{profile.displayName || "Someone"} (@{profile.handle}) asked to connect.</p>
      ) : null}
      <p className="mt-3 text-sm text-muted-foreground">{[profile.institution, profile.course, profile.roleTitle, profile.location].filter(Boolean).join(" · ") || "No public details."}</p>
      {profile.interests ? <p className="mt-2 text-sm text-muted-foreground">{profile.interests}</p> : null}
      {profile.skills ? <p className="mt-1 text-sm text-muted-foreground">{profile.skills}</p> : null}
      {!person.data.self && person.data.blocked ? (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">You blocked this person. They stay out of discovery.</p>
          <button type="button" className="mt-3 h-11 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => run.mutate("unblock")}>Unblock</button>
          {note ? <p className="mt-3 text-sm text-muted-foreground">{note}</p> : null}
        </div>
      ) : null}
      {!person.data.self && !person.data.blocked ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper" disabled={run.isPending} onClick={() => run.mutate(person.data?.ok && person.data.followStatus ? "unfollow" : "follow")}>
            {person.data.followStatus === "active" ? "Unfollow" : person.data.followStatus === "pending" ? "Cancel follow request" : "Follow"}
          </button>
          {person.data.requestStatus === "pending" && !person.data.requestFromMe ? (
            <>
              <button
                type="button"
                className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper"
                disabled={run.isPending}
                onClick={() => {
                  const requestId = person.data && person.data.ok ? person.data.requestId ?? "" : "";
                  const userId = person.data && person.data.ok ? person.data.profile.userId : "";
                  void respondConnection({ data: { id: requestId, userId, action: "accept" } })
                    .then(async (result) => {
                      setNote(result.ok ? "Connected." : result.error);
                      await refresh();
                    })
                    .catch((error: unknown) => {
                      setNote(error instanceof Error ? error.message : "That request could not be accepted.");
                    });
                }}
              >
                Accept
              </button>
              <button
                type="button"
                className="h-11 rounded-full px-4 text-sm ring-1 ring-border"
                disabled={run.isPending}
                onClick={() => {
                  const requestId = person.data && person.data.ok ? person.data.requestId ?? "" : "";
                  const userId = person.data && person.data.ok ? person.data.profile.userId : "";
                  void respondConnection({ data: { id: requestId, userId, action: "decline" } })
                    .then(async (result) => {
                      setNote(result.ok ? "Request declined." : result.error);
                      await refresh();
                    })
                    .catch((error: unknown) => {
                      setNote(error instanceof Error ? error.message : "That request could not be declined.");
                    });
                }}
              >
                Decline
              </button>
            </>
          ) : (
            <button type="button" className="h-11 rounded-full px-4 text-sm ring-1 ring-border" disabled={run.isPending || Boolean(person.data.requestStatus)} onClick={() => run.mutate("connect")}>
              {person.data.requestStatus === "accepted" ? "Connected" : person.data.requestFromMe ? "Request sent" : "Connect"}
            </button>
          )}
          {profile.allowMessages && person.data.requestStatus === "accepted" ? (
            <MessageLink handle={profile.handle} className="inline-flex h-11 items-center rounded-full px-4 text-sm ring-1 ring-border" />
          ) : null}
          {note ? <p className="w-full text-sm text-muted-foreground">{note}</p> : null}
        </div>
      ) : null}
      {person.data.self ? <p className="mt-5 text-sm text-muted-foreground">This is your directory profile.</p> : null}
      {!person.data.self && !person.data.blocked ? (
        <section className="mt-8 rounded-2xl bg-card p-4 ring-1 ring-border">
          <p className="text-sm font-medium">Safety</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REPORTS.map((item) => (
              <button key={item} type="button" className={`h-9 rounded-full px-3 text-xs ${report === item ? "bg-ink text-paper" : "ring-1 ring-border"}`} onClick={() => setReport(item)}>
                {item}
              </button>
            ))}
          </div>
          <button type="button" className="mt-3 h-11 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => run.mutate("report")}>Report</button>
          <button type="button" className="mt-3 ml-2 h-11 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => run.mutate("block")}>Block</button>
        </section>
      ) : null}
    </main>
  );
}
