import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function useAuthReady() {
  return useCurrentUserState();
}

export function SignInCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link to="/login" className="mt-5 inline-block">
        <Button>Sign in to continue</Button>
      </Link>
    </div>
  );
}
