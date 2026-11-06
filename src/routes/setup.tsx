import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AccountAlert, AccountButton, AccountField, AccountFrame } from "@/components/account/frame";
import { interestsList, type SetupStep } from "@/lib/account/domain";
import { getMyAccount, saveSetup } from "@/lib/account/server";
import { useSettledUser } from "@/lib/account/use-settled-user";

export const Route = createFileRoute("/setup")({ component: Setup });

const CHOICES = ["Design", "Medicine", "Engineering", "Business", "Music", "Film", "Sport", "Technology", "Writing", "Community"];

function Setup() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, waiting } = useSettledUser();
  const account = useQuery({
    queryKey: ["unibud-account", user?.id],
    queryFn: () => getMyAccount(),
    enabled: !waiting && Boolean(user),
  });
  const [photo, setPhoto] = useState("");
  const [bio, setBio] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [location, setLocation] = useState("");
  const [discoverable, setDiscoverable] = useState(false);
  const [allowMessages, setAllowMessages] = useState(true);
  const [showInstitution, setShowInstitution] = useState(true);
  const [showLocation, setShowLocation] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  if (account.data && !hydrated) {
    setPhoto(account.data.photoUrl);
    setBio(account.data.bio);
    setPicked(interestsList(account.data.interests));
    setInstitution(account.data.institution);
    setCourse(account.data.course);
    setLocation(account.data.location);
    setDiscoverable(account.data.discoverable);
    setAllowMessages(account.data.status === "complete" ? account.data.allowMessages : true);
    setShowInstitution(account.data.showInstitution);
    setShowLocation(account.data.showLocation);
    setHydrated(true);
  }

  if (waiting) return <AccountFrame kicker="Profile" title="Setting up" body="Checking your account." />;
  if (!user) return <Navigate to="/login" />;
  if (account.data?.status === "unverified") return <Navigate to="/verify" />;
  if (account.data?.status === "suspended") return <Navigate to="/suspended" />;
  if (account.data?.status === "complete") return <Navigate to="/" />;

  const step: SetupStep = account.data?.setupStep ?? "photo";

  async function save(next: SetupStep, finish = false, photoUrl = photo) {
    setBusy(true);
    setError("");
    const resolvedPhoto = (photoUrl || account.data?.photoUrl || (finish ? "initials" : "")).trim();
    try {
      const result = await saveSetup({
        data: {
          step: next,
          photoUrl: resolvedPhoto,
          bio,
          interests: picked,
          institution,
          course,
          location,
          discoverable,
          allowMessages,
          showInstitution,
          showLocation,
          finish,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["unibud-account"] });
      if (result.status === "complete") {
        await router.invalidate();
        await router.navigate({ to: "/" });
      }
    } catch {
      setError("That step could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a photo.");
      return;
    }
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.82));
  }

  const titles: Record<SetupStep, string> = {
    photo: "Add a photo",
    bio: "Write a short biography",
    interests: "What are you into?",
    education: "Education",
    location: "Location",
    privacy: "Privacy",
    preview: "This is your profile",
  };

  return (
    <AccountFrame kicker="Profile" title={titles[step]} body="You can leave and come back. Home opens after the preview.">
      {step === "photo" ? (
        <div className="space-y-4">
          {photo ? <img src={photo} alt="" className="size-28 rounded-full object-cover" /> : (
            <div className="grid size-28 place-items-center rounded-full bg-card text-lg ring-1 ring-border">
              {(account.data?.firstName?.[0] ?? "U").toUpperCase()}
            </div>
          )}
          <label className="grid h-12 cursor-pointer place-items-center rounded-full text-sm font-medium ring-1 ring-border">
            Choose a photograph
            <input type="file" accept="image/*" className="sr-only" aria-label="Profile photograph" onChange={(event) => void onPhoto(event.target.files?.[0])} />
          </label>
          <AccountButton disabled={busy || !photo} onClick={() => void save("photo")}>Continue</AccountButton>
          <button type="button" className="h-11 w-full text-sm text-muted-foreground" onClick={() => { setPhoto("initials"); void save("photo", false, "initials"); }}>
            Continue with initials
          </button>
        </div>
      ) : null}
      {step === "bio" ? (
        <div className="space-y-4">
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} className="min-h-32 w-full rounded-2xl bg-card p-4 text-sm ring-1 ring-border outline-none" placeholder="A line or two" />
          <AccountButton disabled={busy} onClick={() => void save("bio")}>Save biography</AccountButton>
        </div>
      ) : null}
      {step === "interests" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CHOICES.map((choice) => {
              const on = picked.includes(choice);
              return (
                <button key={choice} type="button" className={`h-10 rounded-full px-4 text-sm ${on ? "bg-ink text-paper" : "ring-1 ring-border"}`} onClick={() => setPicked((list) => on ? list.filter((item) => item !== choice) : [...list, choice])}>
                  {choice}
                </button>
              );
            })}
          </div>
          <AccountButton disabled={busy} onClick={() => void save("interests")}>Save interests</AccountButton>
        </div>
      ) : null}
      {step === "education" ? (
        <div className="space-y-4">
          <AccountField label="Institution" value={institution} onChange={setInstitution} />
          <AccountField label="Course or role" value={course} onChange={setCourse} />
          <AccountButton disabled={busy} onClick={() => void save("education")}>Continue</AccountButton>
          <button type="button" className="h-11 w-full text-sm text-muted-foreground" onClick={() => void save("education")}>Skip</button>
        </div>
      ) : null}
      {step === "location" ? (
        <div className="space-y-4">
          <AccountField label="Location" value={location} onChange={setLocation} />
          <AccountButton disabled={busy} onClick={() => void save("location")}>Continue</AccountButton>
          <button type="button" className="h-11 w-full text-sm text-muted-foreground" onClick={() => void save("location")}>Skip</button>
        </div>
      ) : null}
      {step === "privacy" ? (
        <div className="space-y-4 text-sm">
          <Check label="Appear in discovery" checked={discoverable} onChange={setDiscoverable} />
          <Check label="Show institution" checked={showInstitution} onChange={setShowInstitution} />
          <Check label="Show location" checked={showLocation} onChange={setShowLocation} />
          <Check label="Allow messages from connections" checked={allowMessages} onChange={setAllowMessages} />
          <AccountButton disabled={busy} onClick={() => void save("privacy")}>Save privacy</AccountButton>
        </div>
      ) : null}
      {step === "preview" && account.data ? (
        <div className="space-y-4">
          <article className="rounded-3xl bg-card p-5 ring-1 ring-border">
            {photo && photo !== "initials" ? <img src={photo} alt="" className="size-16 rounded-full object-cover" /> : <div className="grid size-16 place-items-center rounded-full bg-secondary">{account.data.firstName[0]}</div>}
            <h2 className="mt-4 font-display text-3xl">{account.data.firstName} {account.data.lastName}</h2>
            <p className="text-sm text-muted-foreground">@{account.data.username}</p>
            <p className="mt-3 text-sm">{bio}</p>
            <p className="mt-2 text-sm text-muted-foreground">{picked.join(" · ")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{[showInstitution ? institution : "", showLocation ? location : ""].filter(Boolean).join(" · ") || "Private details stay hidden."}</p>
          </article>
          {error ? <AccountAlert>{error}</AccountAlert> : null}
          <AccountButton disabled={busy} onClick={() => void save("preview", true)}>Enter UNIBUD</AccountButton>
        </div>
      ) : null}
      {step !== "preview" && error ? <AccountAlert>{error}</AccountAlert> : null}
    </AccountFrame>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
