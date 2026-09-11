"use client";
import { useEffect, useState } from "react";
import { GitBranch, Globe, GraduationCap, Plus, Save, Trash2 } from "lucide-react";
import { useMe, useApiStore } from "@/client/store/apiStore";
import { useStore } from "@/client/store/useStore";
import { CLUSTERS } from "@/client/data/seed";
import { ROLES, ROLE_LABEL, type RoleKey } from "@/client/types";
import { AvailabilityGrid, AvailabilityStrip, LevelPicker, roleTone } from "@/components/shared";
import {
  Button,
  Chip,
  Field,
  Input,
  Label,
  Meter,
  Panel,
  Reveal,
  SectionHead,
  Select,
  Textarea,
} from "@/components/ui";
import { ThemedRadar, useChartTokens } from "@/components/charts";
import { CLUSTER_NAME, CLUSTER_ORDER } from "@/client/data/seed";
import { cn } from "@/client/utils/cn";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SocialAccountsSection } from "@/components/profile/SocialAccountsSection";

export default function Profile() {
  const initialMe = useMe();
  // We use local state for the form draft
  const [me, setMe] = useState(() => initialMe);
  const pushToast = useApiStore((s) => s.pushToast);
  const updateProfileApi = useApiStore((s) => s.updateProfile);
  const loadUser = useApiStore((s) => s.loadUser);
  const queryClient = useQueryClient();
  const t = useChartTokens();
  const [dirty, setDirty] = useState(false);
  const [snapshot] = useState(() => JSON.stringify(initialMe));

  // Sync state if user data loads after initial mount
  useEffect(() => {
    if (!dirty && initialMe && initialMe.id !== 'me-guest') {
      setMe(initialMe);
    }
  }, [initialMe, dirty]);

  const profileMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return updateProfileApi(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await loadUser();
      setDirty(false);
    },
    onError: (err: unknown) => {
      console.error("Profile update error:", err);
    },
  });

  const patch = (p: Partial<typeof me>) => {
    setMe((prev) => ({ ...prev, ...p }));
    setDirty(true);
  };

  const handleSave = async () => {
    const selectedSkills = me.skills
      .filter((s) => s.level > 0)
      .map((s) => s.label);

    await profileMutation.mutateAsync({
      fullName: me.name,
      bio: me.bio || undefined,
      branch: me.branch || undefined,
      graduationYear: me.year ? 2026 + (me.year - 1) : undefined,
      rolePreference: me.role,
      skills: selectedSkills,
      isOpenToTeam: me.openToTeams,
      availability: JSON.stringify(me.availability),
    });
  };

  const setSkillLevel = (id: string, level: 0 | 1 | 2 | 3) => {
    const exists = me.skills.find((s) => s.id === id);
    const meta = CLUSTERS.find((c) => c.label.toLowerCase().replace(/[^a-z]+/g, "-") === id);
    if (exists) {
      patch({ skills: me.skills.map((s) => (s.id === id ? { ...s, level } : s)) });
    } else {
      patch({
        skills: [
          ...me.skills,
          {
            id,
            cluster: meta?.cluster ?? "interface",
            label: meta?.label ?? id,
            level,
          },
        ],
      });
    }
  };

  const completeness = Math.round(
    (me.bio ? 15 : 0) +
      Math.min(30, me.skills.filter((s) => s.level > 0).length * 5) +
      Math.min(20, me.projects.length * 10) +
      Math.min(15, me.repos.length * 7) +
      (me.availability.length ? 12 : 0) +
      (me.verified ? 8 : 0),
  );

  const gaps = [
    me.bio ? null : "Write a one-line bio",
    me.skills.filter((s) => s.level > 0).length < 4 ? "Select at least 4 skills" : null,
    me.availability.length < 2 ? "Pick at least 2 available time slots" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHead
        index="05"
        kicker="Profile"
        title={<>A technical profile, not a résumé.</>}
        sub="Everything here feeds the matching engine. Skill levels set your team's coverage; availability sets who you can actually build with."
        right={
          <div className="flex items-center gap-3">
            {dirty && (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
                unsaved changes
              </span>
            )}
            <Button
              variant={dirty ? "primary" : "outline"}
              disabled={profileMutation.isPending}
              onClick={handleSave}
            >
              <Save size={13} /> {profileMutation.isPending ? "Saving..." : dirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 py-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Reveal>
            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">identity</Label>
              </div>
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <Field label="full name">
                  <Input value={me.name} onChange={(e) => patch({ name: e.target.value })} />
                </Field>
                <Field label="handle">
                  <Input value={me.handle} onChange={(e) => patch({ handle: e.target.value })} />
                </Field>
                <Field label="unique id (student code)">
                  <Input value={me.studentCode || 'Not Assigned'} disabled className="bg-hover font-mono text-accent" />
                </Field>
                <Field label="college">
                  <Input value={me.college} onChange={(e) => patch({ college: e.target.value })} />
                </Field>
                <Field label="branch">
                  <Input value={me.branch} onChange={(e) => patch({ branch: e.target.value })} />
                </Field>
                <Field label="year">
                  <Select
                    value={me.year}
                    onChange={(e) => patch({ year: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="goal">
                  <Select value={me.goal} onChange={(e) => patch({ goal: e.target.value as "win" | "learn" | "ship" })}>
                    <option value="win">Win</option>
                    <option value="ship">Ship something real</option>
                    <option value="learn">Learn</option>
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="bio" hint="One line. What you actually build.">
                    <Textarea rows={2} value={me.bio} onChange={(e) => patch({ bio: e.target.value })} />
                  </Field>
                </div>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={60}>
            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">roles</Label>
              </div>
              <div className="px-5 py-5">
                <span className="mono-label mb-3 block text-fg3">primary</span>
                <div className="flex flex-wrap gap-px border border-line bg-raised p-px">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => patch({ role: r })}
                      className={cn(
                        "px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                        me.role === r ? "bg-accent-soft text-accent" : "text-fg3 hover:text-fg",
                      )}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
                <span className="mono-label mb-3 mt-5 block text-fg3">secondary</span>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.filter((r) => r !== me.role).map((r) => {
                    const on = me.secondary.includes(r);
                    return (
                      <Chip
                        key={r}
                        tone={on ? roleTone[r] : "neutral"}
                        onClick={() =>
                          patch({
                            secondary: on
                              ? me.secondary.filter((x) => x !== r)
                              : [...me.secondary, r].slice(0, 2),
                          })
                        }
                      >
                        {ROLE_LABEL[r]}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={100}>
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">skills</Label>
                <span className="font-mono text-[10px] text-fg3">
                  {me.skills.filter((s) => s.level > 0).length} selected
                </span>
              </div>
              <div className="divide-y divide-line">
                {CLUSTERS.map((c) => {
                  const id = c.label.toLowerCase().replace(/[^a-z]+/g, "-");
                  const cur = me.skills.find((s) => s.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between gap-4 px-5 py-2.5">
                      <div className="min-w-0">
                        <div className="text-[13px] text-fg">{c.label}</div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg3">
                          {CLUSTER_NAME[c.cluster]}
                        </div>
                      </div>
                      <LevelPicker
                        label={c.label}
                        value={(cur?.level ?? 0) as 0 | 1 | 2 | 3}
                        onChange={(v) => setSkillLevel(id, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={140}>
            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">weekly availability</Label>
              </div>
              <div className="px-5 py-5">
                <AvailabilityGrid
                  value={me.availability}
                  editable
                  onChange={(v) => patch({ availability: v, weeklyHours: v.reduce((a, s) => a + (s.end - s.start), 0) })}
                />
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={180}>
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">proof of work</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    patch({
                      repos: [
                        ...me.repos,
                        { name: "new-repo", lang: "TypeScript", stars: 0, url: "https://github.com" },
                      ],
                    });
                    pushToast({ label: "Repository added", body: "Update the name and language.", tone: "info" });
                  }}
                >
                  <Plus size={12} /> Add repo
                </Button>
              </div>
              <div className="divide-y divide-line">
                {me.repos.map((r, i) => (
                  <div key={r.name + i} className="flex items-center gap-3 px-5 py-3">
                    <GitBranch size={14} className="shrink-0 text-fg3" />
                    <input
                      value={r.name}
                      aria-label="Repository name"
                      onChange={(e) =>
                        patch({
                          repos: me.repos.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                        })
                      }
                      className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-fg focus:outline-none"
                    />
                    <span className="shrink-0 font-mono text-[10px] text-fg3">{r.lang}</span>
                    <span className="shrink-0 font-mono text-[10px] tnum text-fg3">★ {r.stars}</span>
                    <button
                      aria-label="Remove repository"
                      onClick={() => patch({ repos: me.repos.filter((_, j) => j !== i) })}
                      className="shrink-0 text-fg3 transition-colors hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {me.repos.length === 0 && (
                  <p className="px-5 py-4 text-[12.5px] text-fg2">
                    No repositories linked. Build history is 18% of your complement score.
                  </p>
                )}
              </div>
              <div className="border-t border-line">
                {me.projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-0">
                    <div className="min-w-0">
                      <div className="text-[13px] text-fg">{p.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-fg3">
                        {ROLE_LABEL[p.role as RoleKey]} · {p.outcome}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] tnum text-fg3">{p.year}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={200}>
            <SocialAccountsSection />
          </Reveal>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Reveal delay={60}>
            <Panel ticks>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">profile completeness</Label>
              </div>
              <div className="px-5 py-5">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[38px] leading-none tnum text-fg">{completeness}%</span>
                  <span className="font-mono text-[10px] text-fg3">signal coverage</span>
                </div>
                <div className="mt-3">
                  <Meter value={completeness} tone={completeness >= 80 ? "mint" : "amber"} height={4} />
                </div>
                {gaps.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {gaps.map((g) => (
                      <li key={g} className="flex items-start gap-2 text-[12.5px] text-fg2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber" />
                        {g}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-mint">
                    all signals populated
                  </p>
                )}
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={100}>
            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">skill vector</Label>
              </div>
              <div className="px-4 py-4">
                <ThemedRadar
                  height={240}
                  data={{
                    labels: CLUSTER_ORDER.map((c) => CLUSTER_NAME[c]),
                    datasets: [
                      {
                        label: "you",
                        data: CLUSTER_ORDER.map((c) =>
                          Math.min(3, me.skills.filter((s) => s.cluster === c).reduce((a, s) => a + s.level, 0)),
                        ),
                        borderColor: t.accent,
                        backgroundColor: `${t.accent}26`,
                        pointBackgroundColor: t.accent,
                        borderWidth: 1.5,
                        pointRadius: 2,
                      },
                    ],
                  }}
                />
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={140}>
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">availability shape</Label>
                <span className="font-mono text-[10px] tnum text-fg3">{me.weeklyHours}h</span>
              </div>
              <div className="px-5 py-4">
                <AvailabilityStrip b={me} />
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={180}>
            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">verification</Label>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <GraduationCap size={14} className="text-mint" />
                  <span className="text-[13px] text-fg">
                    {me.verified ? `${me.college} verified` : "Not verified"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Globe size={13} className="text-fg3" />
                  <span className="font-mono text-[10px] text-fg3">
                    discoverable · accepting requests
                  </span>
                </div>
              </div>
            </Panel>
          </Reveal>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {dirty ? "You have unsaved profile changes" : "Profile saved"} ·{" "}
        {snapshot.length > 0 ? "" : ""}
      </p>
    </div>
  );
}

export type { RoleKey };
