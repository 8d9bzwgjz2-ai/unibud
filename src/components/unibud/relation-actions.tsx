import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { connectLabel, useCampusStore } from "@/lib/unibud/campus-store";
import {
  cancelConnectionRequest,
  getMyPeopleState,
  requestConnection,
  respondToConnection,
  setBlocked,
  setConnected,
  setFollowing,
} from "@/lib/social/people.server";
import { openConversation } from "@/lib/social/server";

/**
 * Follow / Connect / Message / Block for a profile.
 *
 * Real accounts: every action writes a verified server record, then the store
 * is refreshed from the server (so state can never drift client-side).
 * Seeded catalog personas have no account behind them — the server answers
 * `no-account` and the store-only demo behaviour continues, clearly scoped to
 * demo content.
 */
export function RelationActions({ handle }: { handle: string }) {
  const nav = useNavigate();
  const connections = useCampusStore((s) => s.connections);
  const outgoing = useCampusStore((s) => s.outgoing);
  const incoming = useCampusStore((s) => s.incoming);
  const blocked = useCampusStore((s) => s.blocked);
  const following = useCampusStore((s) => s.following);
  const request = useCampusStore((s) => s.request);
  const cancelRequest = useCampusStore((s) => s.cancelRequest);
  const unconnect = useCampusStore((s) => s.unconnect);
  const follow = useCampusStore((s) => s.follow);
  const unfollow = useCampusStore((s) => s.unfollow);
  const accept = useCampusStore((s) => s.accept);
  const decline = useCampusStore((s) => s.decline);
  const setPeopleState = useCampusStore((s) => s.setPeopleState);
  const connected = connections.includes(handle);
  const pending = outgoing.includes(handle);
  const isFollowed = following.includes(handle);
  const isIncoming = incoming.includes(handle);
  const isBlocked = blocked.includes(handle);
  const connectText = connectLabel(handle, { connections, outgoing });

  async function sync() {
    try {
      setPeopleState(await getMyPeopleState());
    } catch {
      /* offline/server hiccup — the toast below already reported it */
    }
  }

  async function onConnect() {
    try {
      if (connected) await setConnected({ data: { handle, connected: false } });
      else if (pending) await cancelConnectionRequest({ data: { handle } });
      else {
        const r = await requestConnection({ data: { handle } });
        if (!r.ok && r.reason === "no-account") request(handle); // demo persona
      }
      await sync();
    } catch {
      toast.error("Could not update this connection.");
    }
  }

  async function onFollow() {
    try {
      const r = await setFollowing({ data: { handle, following: !isFollowed } });
      if (!r.ok && r.reason === "no-account") (isFollowed ? unfollow : follow)(handle);
      else if (!r.ok && r.reason === "blocked") toast.error("This account is unavailable.");
      await sync();
    } catch {
      toast.error("Could not update this follow.");
    }
  }

  async function onMessage() {
    try {
      const convo = await openConversation({ data: { handle } });
      void nav({ to: "/messages/$id", params: { id: convo.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open this chat.");
    }
  }

  async function onBlock() {
    try {
      const r = await setBlocked({ data: { handle, blocked: !isBlocked } });
      if (!r.ok && r.reason === "no-account") return;
      await sync();
      toast.success(isBlocked ? "Unblocked." : "Blocked. They can no longer follow, connect, or message you.");
    } catch {
      toast.error("Could not update this block.");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isIncoming ? (
        <>
          <Button
            size="sm"
            onClick={() => {
              void respondToConnection({ data: { handle, accept: true } }).then(sync);
              accept(handle);
            }}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void respondToConnection({ data: { handle, accept: false } }).then(sync);
              decline(handle);
            }}
          >
            Decline
          </Button>
        </>
      ) : (
        <Button size="sm" variant={connected || pending ? "outline" : "primary"} onClick={() => void onConnect()}>
          {isBlocked ? "Blocked" : connectText}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => void onFollow()}>
        {isFollowed ? "Following" : "Follow"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => void onMessage()}>
        Message
      </Button>
      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => void onBlock()}>
        {isBlocked ? "Unblock" : "Block"}
      </Button>
    </div>
  );
}
