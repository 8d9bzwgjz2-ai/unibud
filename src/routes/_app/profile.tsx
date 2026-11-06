import { createFileRoute } from "@tanstack/react-router";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { InstagramProfile } from "@/components/unibud/instagram-profile";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const { user, isPending } = useAuthReady();
  if (isPending) return <div className="m-4 h-40 animate-pulse rounded-2xl bg-secondary" />;
  if (!user) {
    return (
      <main className="px-5 py-8">
        <SignInCard title="Your profile" body="Sign in to keep a student identity on UNIBUD." />
      </main>
    );
  }
  return (
    <main className="safe-bottom px-4 pt-3">
      <InstagramProfile />
    </main>
  );
}
