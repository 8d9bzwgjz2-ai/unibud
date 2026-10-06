import { useQuery } from "@tanstack/react-query";
import { getMyLync } from "@/lib/lync/server";
import { lyncMessage, type LyncView } from "@/lib/lync/copy";
import { useAuthReady } from "@/components/unibud/sign-in-gate";

/**
 * One quiet line about the user's real Lync, inside the existing feed.
 * Typography untouched — this adds no chrome to the Square rhythm.
 */
export function LyncStatus() {
  const { user } = useAuthReady();
  const lync = useQuery<LyncView>({
    queryKey: ["my-lync"],
    queryFn: () => getMyLync(),
    enabled: Boolean(user),
  });
  if (!user || !lync.data) return null;
  const message = lyncMessage(lync.data, new Date().toISOString().slice(0, 10));
  return (
    <p className="mt-2 px-4 text-xs text-muted-foreground">
      <span className="mr-1 inline-block size-1.5 rounded-full bg-bud align-middle" aria-hidden />
      {message}
    </p>
  );
}
