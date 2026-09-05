"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";
import { Send, X, Loader2 } from "lucide-react";
import { byIdMap, useMe, useApiStore } from "@/client/store/apiStore";
import { ROLE_LABEL, type RoleKey, ROLES } from "@/client/types";
import { teamCoverage } from "@/client/lib/matching";
import { Avatar, CoverageHead, CoverageMatrix, CoverageLegend, relTime, roleTone } from "@/components/shared";
import {
  Button,
  Chip,
  EmptyState,
  Label,
  Panel,
  Reveal,
  SectionHead,
} from "@/components/ui";
import { cn } from "@/client/utils/cn";
import { removeTeamMember } from "@/client/lib/api";


/* ------------------------------------------------------------------ */
/* Teams Index                                                         */
/* ------------------------------------------------------------------ */
function TeamsIndex() {
  const router = useRouter();
  const teams = useApiStore((s) => s.teams);
  const hackathons = useApiStore((s) => s.hackathons);
  const builders = useApiStore((s) => s.builders);
  const loadHackathons = useApiStore((s) => s.loadHackathons);
  const loadTeams = useApiStore((s) => s.loadTeams);
  const activeTeamId = useApiStore((s) => s.activeTeamId);
  const setActiveTeam = useApiStore((s) => s.setActiveTeam);
  const pushToast = useApiStore((s) => s.pushToast);
  const createTeam = useApiStore((s) => s.createTeam);
  const me = useMe();
  const byId = useMemo(() => byIdMap(builders), [builders]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [hk, setHk] = useState("");
  const [cap, setCap] = useState(4);
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadTeams(), loadHackathons()]).then(() => setLoading(false));
  }, [loadTeams, loadHackathons]);

  // Set default hackathon once loaded
  useEffect(() => {
    if (!hk && hackathons.length > 0) {
      setHk(hackathons[0].id);
    }
  }, [hackathons, hk]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] py-16 text-center">
        <Loader2 size={20} className="mx-auto animate-spin text-accent" />
      </div>
    );
  }

  const toggleRole = (role: string) => {
    setRolesNeeded(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHead
        index="04"
        kicker="Teams"
        title={<>Assemble the team like a system diagram.</>}
        sub="Each team is a coverage problem: a set of clusters, the members who hold them, and the slots still open."
        right={
          <div className="flex gap-2">
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!joinCode.trim()) return;
              setJoining(true);
              try {
                const { applyToTeam } = await import("@/client/lib/api/teams");
                await applyToTeam(joinCode.trim(), "Joining via team code");
                pushToast({ label: "Success", body: "Request sent to join team.", tone: "good" });
                setJoinCode("");
              } catch (e) {
                pushToast({ label: "Error", body: "Could not join. Check the code.", tone: "bad" });
              } finally {
                setJoining(false);
              }
            }} className="flex">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter Team ID"
                className="w-32 bg-canvas px-3 py-1 text-[12px] border border-line outline-none focus:border-accent"
              />
              <Button type="submit" disabled={!joinCode.trim() || joining} className="rounded-l-none border-l-0">
                Join
              </Button>
            </form>
            <Button onClick={() => setCreating(true)}>
              <Send size={13} /> Create team
            </Button>
          </div>
        }
      />

      {teams.length === 0 ? (
        <div className="py-16 text-center">
          <EmptyState
            title="No teams yet"
            body="Create your first team to get started. Teams help you organize teammates for hackathons."
            action={<Button onClick={() => setCreating(true)}><Send size={13} /> Create team</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-px border border-line bg-line py-8 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((t, i) => {
            const h = hackathons.find((x) => x.id === t.hackathonId);
            const cov = teamCoverage(t, byId, h);
            const isActive = t.id === activeTeamId;
            return (
              <Reveal key={t.id} delay={i * 70}>
                <div className={cn("flex h-full flex-col bg-surface p-5 transition-colors", isActive && "bg-raised")}>
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/teams/${t.id}`} className="display text-[19px] text-fg transition-colors hover:text-accent">
                        {t.name}
                      </Link>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fg3">
                        {h?.name ?? "No hackathon"} · {(t.members ?? []).length}/{t.maxMembers ?? 4}
                      </div>
                      <div className="mt-2 font-mono text-[9px] text-accent">
                        Team ID: {t.id}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTeam(t.id);
                        pushToast({ label: "Active team", body: `${t.name} is now the matching context.`, tone: "info" });
                      }}
                      className={cn(
                        "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors",
                        isActive ? "border-accent-line bg-accent-soft text-accent" : "border-line text-fg3 hover:text-fg",
                      )}
                    >
                      {isActive ? "active" : "set active"}
                    </button>
                  </div>

                  <div className="mt-5 flex items-center gap-4">
                    <CoverageHead coverage={cov} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(t.rolesNeeded ?? []).map((role: string) => (
                      <Chip key={role} tone="amber">{ROLE_LABEL[role as RoleKey] ?? role} open</Chip>
                    ))}
                    {(t.rolesNeeded ?? []).length === 0 && <Chip tone="mint">roster full</Chip>}
                    <Chip>{t.visibility ?? (t.isOpen ? "discoverable" : "private")}</Chip>
                  </div>

                  <div className="mt-5 flex gap-2 border-t border-line pt-4">
                    <Link href={`/teams/${t.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">Workspace</Button>
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-[#05070c]/70 backdrop-blur-[2px]" onClick={() => setCreating(false)} />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md border border-line-strong bg-surface p-5"
              style={{ boxShadow: "var(--shadow-float)" }}
            >
              <Label tone="fg">create team</Label>
              <div className="mt-4 space-y-4">
                <div>
                  <span className="mono-label mb-2 block text-fg3">team name *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Orbit-05"
                    className="w-full border border-line bg-raised px-3 py-2.5 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <span className="mono-label mb-2 block text-fg3">target hackathon</span>
                  <select
                    value={hk}
                    onChange={(e) => setHk(e.target.value)}
                    className="w-full border border-line bg-raised px-3 py-2.5 text-[13px] text-fg focus:border-accent focus:outline-none"
                  >
                    <option value="">— none —</option>
                    {hackathons.filter((h) => h.status !== "closed").map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="mono-label mb-2 block text-fg3">max size</span>
                  <div className="flex gap-px border border-line bg-raised p-px">
                    {[3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCap(n)}
                        className={cn(
                          "flex-1 py-2 font-mono text-[12px] tnum transition-colors",
                          cap === n ? "bg-accent-soft text-accent" : "text-fg3 hover:text-fg",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="mono-label mb-2 block text-fg3">roles needed</span>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={cn(
                          "px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest border transition-colors",
                          rolesNeeded.includes(role)
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-line text-fg3 hover:text-fg",
                        )}
                      >
                        {ROLE_LABEL[role as RoleKey]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={name.trim().length < 2}
                  onClick={async () => {
                    const id = await createTeam({
                      name: name.trim(),
                      hackathonId: hk || undefined,
                      maxMembers: cap,
                      rolesNeeded,
                      isOpen: true,
                    });
                    if (id) {
                      setCreating(false);
                      setName("");
                      setRolesNeeded([]);
                      router.push(`/teams/${id}`);
                    }
                  }}
                >
                  Create
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team workspace                                                      */
/* ------------------------------------------------------------------ */
function TeamWorkspace() {
  const { id } = useParams();
  const teams = useApiStore((s) => s.teams);
  const builders = useApiStore((s) => s.builders);
  const hackathons = useApiStore((s) => s.hackathons);
  const requests = useApiStore((s) => s.requests);
  const projects = useApiStore((s) => s.projects);
  const pushToast = useApiStore((s) => s.pushToast);
  const loadTeams = useApiStore((s) => s.loadTeams);
  const me = useMe();
  const byId = useMemo(() => byIdMap(builders), [builders]);

  const team = teams.find((t) => t.id === id) ?? teams[0];
  const hack = hackathons.find((h) => h.id === team?.hackathonId);
  const project = projects.find((p) => p.id === team?.project);
  // pending requests for this team using real DB field names
  const pending = requests.filter((r: any) => {
    const req = r.request ?? r;
    return req.teamId === team?.id && req.status === "pending";
  });

  const cov = useMemo(
    () => (team ? teamCoverage(team, byId, hack) : null),
    [team, byId, hack],
  );

  if (!team || !cov)
    return <EmptyState title="Team not found" body="Pick a team from the index." action={<Link href="/teams"><Button variant="outline">Teams</Button></Link>} />;

  const demand = Object.entries(hack?.trackDemands ?? {});
  const roleCov = (role: string) => {
    const map: Record<string, string[]> = {
      frontend: ["interface"],
      backend: ["services"],
      ml: ["intelligence"],
      design: ["craft"],
      product: ["narrative"],
      mobile: ["mobile"],
      devops: ["infra"],
    };
    const cs = map[role] ?? [];
    if (!cs.length) return 0;
    return Math.round(
      (cs.reduce((a, c) => a + Math.min(3, cov.byCluster[c] ?? 0), 0) / (cs.length * 3)) * 100,
    );
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <Label tone="accent">
            <span className="text-fg3">team</span> / {team.name}
          </Label>
          <h1 className="display mt-3 text-[clamp(1.8rem,3.6vw,2.8rem)] font-medium leading-tight text-fg">
            {team.name}
          </h1>
          <div className="mt-2 font-mono text-[11px] text-fg3">
            {hack?.name} · {hack?.code} · {team.members.length}/{hack?.maxTeamSize}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CoverageHead coverage={cov} />
          {project && (
            <Link href={`/projects/${project.id}`}>
              <Button variant="outline" size="sm">Open project</Button>
            </Link>
          )}
          <Link href={`/match?hackathon=${team.hackathonId}`}>
            <Button size="sm">Fill a gap</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 py-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Reveal>
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="amber">coverage matrix</Label>
                <span className="font-mono text-[10px] tnum text-fg3">
                  {cov.overall}% · target 85%
                </span>
              </div>
              <CoverageMatrix team={team} byId={byId} />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
                <CoverageLegend />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
                  gap column drives ranking
                </span>
              </div>
            </Panel>
          </Reveal>

          {cov.hardGaps.length > 0 && (
            <Reveal delay={70}>
              <div className="border border-amber-line bg-amber-soft px-5 py-4">
                <Label tone="amber">{cov.hardGaps.length} hard gap{cov.hardGaps.length > 1 ? "s" : ""} detected</Label>
                <p className="mt-2 font-mono text-[11px] text-fg2">
                  {cov.hardGaps.map((c) => CLUSTER_LABEL(c)).join(" · ")}
                </p>
                <Link href={`/match?hackathon=${team.hackathonId}`}>
                  <Button size="sm" className="mt-3">Find people for this gap</Button>
                </Link>
              </div>
            </Reveal>
          )}

          <Reveal delay={110}>
            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">role coverage vs track demand</Label>
              </div>
              <div className="divide-y divide-line">
                {demand.map(([role, w]) => {
                  const c = roleCov(role);
                  const need = Math.round((w ?? 0) * 100);
                  return (
                    <div key={role} className="grid grid-cols-12 items-center gap-4 px-5 py-3">
                      <span className="col-span-4 text-[13px] text-fg">
                        {ROLE_LABEL[role as keyof typeof ROLE_LABEL]}
                      </span>
                      <div className="col-span-6">
                        <div className="relative h-3 w-full bg-hover">
                          <div
                            className="absolute inset-y-0 left-0 bg-accent/80 transition-all duration-1000"
                            style={{ width: `${c}%` }}
                          />
                          <span
                            className="absolute inset-y-[-3px] w-px bg-amber"
                            style={{ left: `${need}%` }}
                            title={`track demand ${need}%`}
                          />
                        </div>
                      </div>
                      <span className={cn("col-span-2 text-right font-mono text-[11px] tnum", c >= need ? "text-mint" : "text-amber")}>
                        {c}% / {need}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 border-t border-line px-5 py-3">
                <span className="flex items-center gap-2"><span className="h-2 w-4 bg-accent/80" /><span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg3">team coverage</span></span>
                <span className="flex items-center gap-2"><span className="h-3 w-px bg-amber" /><span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg3">track demand</span></span>
              </div>
            </Panel>
          </Reveal>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Reveal delay={60}>
            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">roster</Label>
              </div>
              <div className="divide-y divide-line">
                {team.members.map((m) => {
                  const b = byId.get(m.builderId);
                  if (!b) return null;
                  return (
                    <div key={m.builderId} className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar b={b} size={30} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/b/${b.id}`} className="block truncate text-[13.5px] text-fg hover:text-accent">
                            {b.name}
                          </Link>
                          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg3">
                            {ROLE_LABEL[m.role as RoleKey]} · {b.weeklyHours}h/wk
                          </div>
                        </div>
                        {team.ownerId === me.id && m.builderId !== me.id && (
                          <button
                            onClick={() => {
                              removeTeamMember(team.id, m.builderId).then(() => {
                                loadTeams();
                                pushToast({ label: "Member removed", body: `${b.name} left ${team.name}.`, tone: "warn" });
                              });
                            }}
                            className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg3 transition-colors hover:text-danger"
                          >
                            remove
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {b.skills.filter((s) => s.level >= 2).slice(0, 4).map((s) => (
                          <Chip key={s.id}>{s.label}</Chip>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {team.openSlots.map((o) => (
                  <div key={o.role} className="flex items-center gap-3 border-dashed px-5 py-3.5">
                    <span className="flex h-[30px] w-[30px] items-center justify-center border border-dashed border-amber-line bg-amber-soft font-mono text-[11px] text-amber">
                      +
                    </span>
                    <div>
                      <div className="text-[13px] text-amber">{ROLE_LABEL[o.role]} · open</div>
                      <div className="mt-0.5 text-[11.5px] text-fg3">{o.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={100}>
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">pending requests</Label>
                <span className="font-mono text-[10px] tnum text-fg3">{pending.length}</span>
              </div>
              {pending.length === 0 ? (
                <p className="px-5 py-4 text-[12.5px] text-fg2">Nothing waiting. Coverage is what it is.</p>
              ) : (
                <div className="divide-y divide-line">
                  {pending.slice(0, 3).map((r: any) => {
                    const req = r.request ?? r;
                    const fromProfile = r.from ?? null;
                    const b = byId.get(req.fromUserId) ?? (fromProfile ? {
                      id: fromProfile.id,
                      name: fromProfile.fullName ?? fromProfile.username ?? "Unknown",
                      handle: fromProfile.username ?? "",
                      avatarUrl: fromProfile.avatarUrl,
                      initials: (fromProfile.fullName ?? "?").slice(0, 2).toUpperCase(),
                      skills: [],
                    } : null);
                    return (
                      <div key={req.id} className="flex items-center gap-3 px-5 py-3">
                        {b && <Avatar b={b as any} size={26} />}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px] text-fg">{b?.name ?? "Unknown"}</div>
                          <div className="font-mono text-[10px] text-fg3">{req.roleOffered ?? "—"}</div>
                        </div>
                        <Link href="/requests">
                          <Button size="sm" variant="outline">Review</Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function CLUSTER_LABEL(c: string) {
  const map: Record<string, string> = {
    interface: "Interface",
    services: "Services",
    infra: "Infra",
    intelligence: "Intelligence",
    craft: "Craft",
    narrative: "Narrative",
    mobile: "Mobile",
  };
  return map[c] ?? c;
}


export default TeamsIndex;
