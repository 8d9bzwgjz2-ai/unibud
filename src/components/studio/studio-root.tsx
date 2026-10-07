import { useCampusStore } from "@/lib/unibud/campus-store";
import { useStudioStore } from "@/lib/studio/store";
import { CameraStage } from "./camera-stage";
import { PhotoDesk } from "./photo-desk";
import { VideoDesk } from "./video-desk";
import { LibraryDesk } from "./library-desk";
import { PublishDesk } from "./publish-desk";
import { LiveDesk } from "./live-desk";
import { SettingsDesk } from "./settings-desk";
import { WriteDesk } from "./write-desk";
import { LockedDesk } from "./locked-desk";

export function StudioRoot() {
  const open = useCampusStore((s) => s.composeOpen);
  const setOpen = useCampusStore((s) => s.setComposeOpen);
  const view = useStudioStore((s) => s.view);

  if (!open) return null;

  function close() {
    const s = useStudioStore.getState();
    if (s.image || s.video || s.clips.length || s.caption.trim()) s.saveDraft();
    setOpen(false);
    s.setView("camera");
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink">
      {view === "camera" ? <CameraStage onClose={close} /> : null}
      {view === "photo" ? <PhotoDesk /> : null}
      {view === "video" ? <VideoDesk /> : null}
      {view === "library" ? <LibraryDesk /> : null}
      {view === "publish" ? <PublishDesk /> : null}
      {view === "live" ? <LiveDesk kind="live" /> : null}
      {view === "stream" ? <LiveDesk kind="stream" /> : null}
      {view === "settings" ? <SettingsDesk /> : null}
      {view === "write" ? <WriteDesk onClose={close} /> : null}
      {view === "locked" ? <LockedDesk /> : null}
    </div>
  );
}
