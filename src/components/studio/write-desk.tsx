import { useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { createPost } from "@/lib/social/server";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useStudioStore } from "@/lib/studio/store";
import { toast } from "sonner";

export function WriteDesk({ onClose }: { onClose: () => void }) {
  const setView = useStudioStore((s) => s.setView);
  const addPost = useCampusStore((s) => s.addPost);
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) {
      onClose();
      void navigate({ to: "/login" });
      return;
    }
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const r = await createPost({ data: { communityId: "unilag-campus", body: draft.trim() } });
      addPost(r.body, r.handle, { id: r.id });
      await router.invalidate();
      onClose();
      void navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-12 items-center justify-between px-2">
        <button type="button" className="h-11 px-2 text-sm" onClick={() => setView("camera")}>
          Camera
        </button>
        <p className="text-sm font-semibold">Write</p>
        <Button size="sm" disabled={busy || !draft.trim()} onClick={() => void submit()}>
          Post
        </Button>
      </div>
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="What’s moving you right now?"
        className="min-h-40 flex-1 resize-none bg-transparent px-5 py-4 text-base outline-none"
      />
    </div>
  );
}
