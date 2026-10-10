import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BadgeCheck, Flame } from "lucide-react";
import { Avatar } from "@/components/unibud/person";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { COMMUNITIES, UNIVERSITIES, uniById } from "@/lib/unibud/catalog";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { roleLabel } from "@/lib/unibud/roles";
import { getMyProfile, upsertMyProfile } from "@/lib/unibud/server";
import { myCommunities } from "@/lib/social/server";
import { getLyncState, LYNC_MILESTONES } from "@/lib/lync/server";
import { IDENTITY_TAGS, SOCIAL_PLATFORMS, isSafeExternalUrl, tagLabel } from "@/lib/unibud/identity-tags";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const { user, isPending } = useAuthReady();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["profile"],
    queryFn: () => getMyProfile(),
    enabled: Boolean(user),
  });
  const mine = useQuery({
    queryKey: ["my-communities"],
    queryFn: () => myCommunities(),
    enabled: Boolean(user),
  });
  const lync = useQuery({
    queryKey: ["lync"],
    queryFn: () => getLyncState(),
    enabled: Boolean(user),
  });
  const [ctx, setCtx] = useState<"social" | "academic">("social");
  const [tab, setTab] = useState<"posts" | "reels" | "saved">("posts");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [universityId, setUniversityId] = useState("unilag");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [bio, setBio] = useState("");
  const [hlName, setHlName] = useState("");

  const role = useCampusStore((s) => s.role ?? "student");
  const faculty = useCampusStore((s) => s.faculty);
  const department = useCampusStore((s) => s.department);
  const setFaculty = useCampusStore((s) => s.setFaculty);
  const setDepartment = useCampusStore((s) => s.setDepartment);
  const connections = useCampusStore((s) => s.connections);
  const following = useCampusStore((s) => s.following);
  const followers = useCampusStore((s) => s.followers);
  const localPosts = useCampusStore((s) => s.localPosts);
  const visibility = useCampusStore((s) => s.profileVisibility);
  const academicVisibility = useCampusStore((s) => s.academicVisibility);
  const identityTags = useCampusStore((s) => s.identityTags);
  const toggleIdentityTag = useCampusStore((s) => s.toggleIdentityTag);
  const socialLinks = useCampusStore((s) => s.socialLinks);
  const setSocialLinks = useCampusStore((s) => s.setSocialLinks);
  const highlights = useCampusStore((s) => s.highlights);
  const addHighlight = useCampusStore((s) => s.addHighlight);
  const removeHighlight = useCampusStore((s) => s.removeHighlight);
  const interests = useCampusStore((s) => s.interests);
  const skills = useCampusStore((s) => s.skills);
  const setSkills = useCampusStore((s) => s.setSkills);
  const projects = useCampusStore((s) => s.projects);
  const avatarDataUrl = useCampusStore((s) => s.avatarDataUrl);
  const setAvatarDataUrl = useCampusStore((s) => s.setAvatarDataUrl);
  const legalName = useCampusStore((s) => s.legalName);
  const setLegalName = useCampusStore((s) => s.setLegalName);
  const setHomeCampusId = useCampusStore((s) => s.setHomeCampusId);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) {
      if (user?.displayName) setDisplayName(user.displayName);
      return;
    }
    setDisplayName(q.data.displayName);
    setHandle(q.data.handle);
    setUniversityId(q.data.universityId);
    setProgram(q.data.program);
    setYear(q.data.year);
    setBio(q.data.bio);
    if (q.data.universityId) setHomeCampusId(q.data.universityId);
  }, [q.data, user, setHomeCampusId]);

  const save = useMutation({
    mutationFn: () =>
      upsertMyProfile({
        data: { displayName, handle, universityId, program, year, bio, campusRole: role },
      }).then((row) => {
        if (row?.universityId) setHomeCampusId(row.universityId);
        return row;
      }),
    onSuccess: () => {
      toast.success("Profile saved");
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <div className="m-4 h-40 animate-pulse rounded-2xl bg-secondary" />;
  if (!user) {
    return (
      <main className="px-5 py-8">
        <SignInCard title="Your profile" body="Sign in to keep a student identity on UNIBUD." />
      </main>
    );
  }

  const uni = uniById(universityId);
  const rooms = COMMUNITIES.filter((c) => mine.data?.includes(c.id)).slice(0, 6);
  const shownHandle = handle || "you";

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Profile</p>
      <p className="mt-1 text-xs text-muted-foreground">
        One identity. Social and Academic are how you show up — not two accounts.
      </p>
      <div className="mt-4 flex items-start gap-4">
        {avatarDataUrl ? (
          <img src={avatarDataUrl} alt="" className="size-16 rounded-2xl object-cover" />
        ) : (
          <Avatar name={displayName || user.displayName || "You"} className="size-16 text-lg rounded-2xl" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl">
            {displayName || user.displayName}
            <BadgeCheck className="ml-1 inline size-4 text-bud" />
          </h1>
          <p className="text-sm text-muted-foreground">@{shownHandle}</p>
          {ctx === "academic" ? (
            <p className="mt-1 text-xs font-medium">{roleLabel(role, program || undefined)}</p>
          ) : identityTags.length ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {identityTags.map(tagLabel).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {bio && ctx === "social" ? <p className="mt-4 text-sm leading-relaxed">{bio}</p> : null}

      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        <Count n={connections.length} label="Connections" />
        <Count n={followers.length} label="Followers" />
        <Count n={following.length} label="Following" />
      </dl>

      {lync.data ? (
        <section className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-center gap-2">
            <Flame className={cn("size-5", lync.data.currentStreak > 0 ? "text-bud" : "text-muted-foreground")} />
            <h2 className="text-sm font-semibold">Lync Streak</h2>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Count n={lync.data.currentStreak} label="Current" />
            <Count n={lync.data.longestStreak} label="Longest" />
            <Count n={lync.data.milestones.length} label="Milestones" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {lync.data.currentStreak > 0
              ? `You've shared ${lync.data.currentStreak} day${lync.data.currentStreak === 1 ? "" : "s"} in a row.`
              : "Share on Square to start your streak."}
            {lync.data.lastShareDate ? ` Last share: ${lync.data.lastShareDate}.` : ""}
          </p>
          {lync.data.milestones.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {lync.data.milestones.map((m) => (
                <span
                  key={m.level}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-bud/10 px-3 text-xs font-medium text-bud"
                >
                  <Flame className="size-3" />
                  {m.level} days
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {LYNC_MILESTONES.map((level) => {
              const earned = lync.data!.milestones.some((m) => m.level === level);
              return (
                <span
                  key={level}
                  className={cn(
                    "inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-medium",
                    earned ? "bg-bud/15 text-bud" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {level}
                </span>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setCtx("social")}
          className={cn(
            "h-9 rounded-full px-4 text-sm",
            ctx === "social" ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
          )}
        >
          Social
        </button>
        <button
          type="button"
          onClick={() => setCtx("academic")}
          className={cn(
            "h-9 rounded-full px-4 text-sm",
            ctx === "academic" ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
          )}
        >
          Academic
        </button>
      </div>

      {ctx === "social" ? (
        <>
          {highlights.length ? (
            <section className="mt-6">
              <h2 className="text-sm font-medium">Highlights</h2>
              <div className="mt-2 flex gap-3 overflow-x-auto">
                {highlights.map((h) => (
                  <div key={h.id} className="w-20 shrink-0 text-center">
                    <div className="mx-auto size-16 overflow-hidden rounded-full bg-secondary ring-2 ring-border">
                      {h.cover ? <img src={h.cover} alt="" className="size-full object-cover" /> : null}
                    </div>
                    <p className="mt-1 truncate text-[11px]">{h.name}</p>
                    {editing ? (
                      <button type="button" className="text-[10px] text-muted-foreground" onClick={() => removeHighlight(h.id)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {interests.length ? (
            <p className="mt-4 text-xs text-muted-foreground">Into {interests.join(", ")}</p>
          ) : null}

          {socialLinks.filter((l) => l.visible && isSafeExternalUrl(l.url)).length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {socialLinks
                .filter((l) => l.visible && isSafeExternalUrl(l.url))
                .map((l) => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 rounded-full bg-secondary px-3 text-xs leading-8 capitalize"
                  >
                    {l.platform}
                  </a>
                ))}
            </div>
          ) : null}

          <div className="mt-6 flex gap-2">
            {(["posts", "reels", "saved"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "h-9 rounded-full px-4 text-sm capitalize",
                  tab === id ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
                )}
              >
                {id === "posts" ? "All posts" : id === "reels" ? "Reels" : "Saved"}
              </button>
            ))}
          </div>
          {tab === "posts" ? (
            <ul className="mt-3 space-y-2">
              {localPosts.map((p) => (
                <li key={p.id} className="rounded-xl bg-card p-3 text-sm ring-1 ring-border">
                  {p.body}
                </li>
              ))}
              {localPosts.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">No posts yet. Square is for sharing.</p>
              ) : null}
            </ul>
          ) : null}
          {tab === "reels" ? (
            <ul className="mt-3 space-y-2">
              {localPosts
                .filter((p) => p.kind === "reel" || p.video)
                .map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
                    {p.image || p.video ? (
                      <img src={p.image ?? p.video} alt="" className="h-32 w-full object-cover" />
                    ) : null}
                    <p className="p-3 text-sm">{p.body}</p>
                  </li>
                ))}
              {localPosts.filter((p) => p.kind === "reel" || p.video).length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Reels you post on Square show up here. They are not a separate app.
                </p>
              ) : null}
            </ul>
          ) : null}
          {tab === "saved" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Saved is private to you.{" "}
              <Link to="/saved" className="font-medium text-foreground">
                Open Saved
              </Link>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Meta label="Campus" value={uni?.shortName ?? "—"} />
            <Meta label="Faculty" value={faculty || "—"} />
            <Meta label="Department" value={department || "—"} />
            <Meta label="Programme" value={program || "—"} />
            <Meta label="Level" value={year || "—"} />
            <Meta label="Academic visibility" value={academicVisibility} />
          </dl>
          {skills.length ? (
            <p className="mt-4 text-xs text-muted-foreground">Skills · {skills.join(" · ")}</p>
          ) : null}
          {projects.length ? (
            <ul className="mt-3 space-y-2">
              {projects.map((p) => (
                <li key={p.id} className="rounded-xl bg-card p-3 text-sm ring-1 ring-border">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {rooms.length ? (
            <section className="mt-6">
              <h2 className="text-sm font-medium">Communities</h2>
              <ul className="mt-2 space-y-2">
                {rooms.map((c) => (
                  <li key={c.id}>
                    <Link to="/communities/$id" params={{ id: c.id }} className="text-sm text-bud">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="mt-4 text-xs text-muted-foreground">
            Legal name stays off the social card. Social visibility: {visibility}.
          </p>
        </>
      )}

      <Button className="mt-6 w-full" variant={editing ? "outline" : "primary"} onClick={() => setEditing((v) => !v)}>
        {editing ? "Close editor" : "Edit Profile"}
      </Button>

      {editing ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Display name">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
          <Field label="Username">
            <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="adaeze" />
          </Field>
          <Field label="Legal name (not shown socially)">
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </Field>
          <Field label="Profile photo (square crop)">
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                setCropSrc((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return url;
                });
                setCropX(50);
                setCropY(50);
              }}
            />
            {cropSrc ? (
              <div className="mt-2 space-y-2">
                <img src={cropSrc} alt="" className="size-24 rounded-2xl object-cover" style={{ objectPosition: `${cropX}% ${cropY}%` }} />
                <label className="block text-[11px] text-muted-foreground">
                  Move horizontally
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cropX}
                    onChange={(e) => setCropX(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
                <label className="block text-[11px] text-muted-foreground">
                  Move vertically
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cropY}
                    onChange={(e) => setCropY(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement("canvas");
                      canvas.width = 320;
                      canvas.height = 320;
                      const ctx2 = canvas.getContext("2d");
                      if (!ctx2) return;
                      const size = Math.min(img.width, img.height);
                      const maxX = img.width - size;
                      const maxY = img.height - size;
                      const sx = (cropX / 100) * maxX;
                      const sy = (cropY / 100) * maxY;
                      ctx2.drawImage(img, sx, sy, size, size, 0, 0, 320, 320);
                      setAvatarDataUrl(canvas.toDataURL("image/jpeg", 0.86));
                    };
                    img.src = cropSrc;
                  }}
                >
                  Use this crop
                </Button>
              </div>
            ) : null}
          </Field>
          <Field label="Bio">
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Social roles</p>
          <div className="flex flex-wrap gap-2">
            {IDENTITY_TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleIdentityTag(t.id)}
                className={cn(
                  "h-8 rounded-full px-3 text-xs",
                  identityTags.includes(t.id) ? "bg-ink text-paper" : "bg-secondary",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">External accounts</p>
          <div className="space-y-2">
            {SOCIAL_PLATFORMS.map((p) => {
              const existing = socialLinks.find((l) => l.platform === p.id);
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-20 text-xs">{p.label}</span>
                  <Input
                    placeholder={`https://${p.host}/you`}
                    value={existing?.url ?? ""}
                    onChange={(e) => {
                      const url = e.target.value;
                      const next = socialLinks.filter((l) => l.platform !== p.id);
                      if (url.trim()) {
                        next.push({
                          id: existing?.id ?? p.id,
                          platform: p.id,
                          url: url.trim(),
                          visible: existing?.visible ?? true,
                        });
                      }
                      setSocialLinks(next);
                    }}
                  />
                </div>
              );
            })}
          </div>
          <Field label="New highlight (optional)">
            <div className="flex gap-2">
              <Input value={hlName} onChange={(e) => setHlName(e.target.value)} placeholder="Hall week" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!hlName.trim()) return;
                  addHighlight({
                    id: `hl-${Date.now()}`,
                    name: hlName.trim(),
                    cover: "/covers/campus-night.jpg",
                    items: ["/covers/campus-night.jpg"],
                  });
                  setHlName("");
                }}
              >
                Add
              </Button>
            </div>
          </Field>
          <Field label="University">
            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className="h-12 w-full rounded-full bg-secondary px-4 text-sm"
            >
              {UNIVERSITIES.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Faculty">
            <Input value={faculty} onChange={(e) => setFaculty(e.target.value)} />
          </Field>
          <Field label="Department">
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
          </Field>
          <Field label="Programme">
            <Input value={program} onChange={(e) => setProgram(e.target.value)} />
          </Field>
          <Field label="Year">
            <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="300" />
          </Field>
          <Field label="Skills (comma)">
            <Input
              value={skills.join(", ")}
              onChange={(e) =>
                setSkills(
                  e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                )
              }
            />
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Save
          </Button>
        </form>
      ) : null}
    </main>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-card py-3 ring-1 ring-border">
      <p className="font-display text-2xl">{n}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
