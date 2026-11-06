import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/** Session hook that refetches once before treating a stale null as signed out. */
export function useSettledUser() {
  const { user, isPending } = useCurrentUserState();
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    if (isPending || user) return;
    let cancel = false;
    void authClient.getSession().finally(() => {
      if (!cancel) setProbed(true);
    });
    return () => {
      cancel = true;
    };
  }, [isPending, user]);

  return { user, waiting: isPending || (!user && !probed) };
}
