import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot({ compact = false }: { compact?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-9 animate-pulse rounded-full bg-secondary" />;
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm font-medium hover:bg-secondary"
      >
        Sign in
      </Link>
    );
  }
  if (compact) {
    return (
      <Link to="/profile" className="block">
        <UserButton />
      </Link>
    );
  }
  return <UserButton />;
}
