import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { connectLabel, useCampusStore } from "@/lib/unibud/campus-store";

export function RelationActions({ handle }: { handle: string }) {
  const connections = useCampusStore((s) => s.connections);
  const outgoing = useCampusStore((s) => s.outgoing);
  const following = useCampusStore((s) => s.following);
  const request = useCampusStore((s) => s.request);
  const cancelRequest = useCampusStore((s) => s.cancelRequest);
  const unconnect = useCampusStore((s) => s.unconnect);
  const follow = useCampusStore((s) => s.follow);
  const unfollow = useCampusStore((s) => s.unfollow);
  const connected = connections.includes(handle);
  const pending = outgoing.includes(handle);
  const isFollowed = following.includes(handle);
  const connectText = connectLabel(handle, { connections, outgoing });

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={connected || pending ? "outline" : "primary"}
        onClick={() => {
          if (connected) unconnect(handle);
          else if (pending) cancelRequest(handle);
          else request(handle);
        }}
      >
        {connectText}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => (isFollowed ? unfollow(handle) : follow(handle))}
      >
        {isFollowed ? "Following" : "Follow"}
      </Button>
      {connected ? (
        <Button size="sm" variant="ghost" asChild>
          <Link to="/messages/$id" params={{ id: handle }}>
            Message
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
