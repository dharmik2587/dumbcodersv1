"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, Loader2, Send, Sparkles, UserPlus } from "lucide-react";
import { byIdMap, useActiveTeam, useMe, useApiStore } from "@/client/store/apiStore";
import { ROLE_LABEL, ROLES, type RoleKey } from "@/client/types";
import { CLUSTER_NAME, CLUSTER_ORDER } from "@/client/data/seed";
import {
  SIGNAL_DETAIL,
  SIGNAL_LABEL,
  rankCandidates,
  teamCoverage,
  type ScoredCandidate,
} from "@/client/lib/matching";
import {
  AvailabilityStrip,
  Avatar,
  CoverageLegend,
  fmtDate,
  roleTone,
} from "@/components/shared";
import {
  Button,
  Chip,
  CountUp,
  EmptyState,
  Field,
  Label,
  Meter,
  Modal,
  Panel,
  Reveal,
  SectionHead,
  Select,
  Textarea,
} from "@/components/ui";
import { ThemedRadar, useChartTokens } from "@/components/charts";
import { cn } from "@/client/utils/cn";

export default function Match() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const builders = useApiStore((s) => s.builders);
  const hackathons = useApiStore((s) => s.hackathons);
  const team = useActiveTeam();
  const teams = useApiStore((s) => s.teams);
  const setActiveTeam = useApiStore((s) => s.setActiveTeam);
  const loadHackathons = useApiStore((s) => s.loadHackathons);
  const loadBuilders = useApiStore((s) => s.loadBuilders);
  const loadTeams = useApiStore((s) => s.loadTeams);

  useEffect(() => {
    if (hackathons.length === 0) loadHackathons();
    if (builders.length === 0) loadBuilders();
    if (teams.length === 0) loadTeams();
  }, [hackathons.length, builders.length, teams.length, loadHackathons, loadBuilders, loadTeams]);

  const byId = useMemo(() => byIdMap(builders), [builders]);
  const t = useChartTokens();

  const hackathonId = params.get("hackathon") ?? team?.hackathonId ?? "";
  const role = (params.get("role") ?? "all") as RoleKey | "all";
  const minScore = Number(params.get("min") ?? 0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [composing, setComposing] = useState<ScoredCandidate | null>(null);

  const hackathon = hackathons.find((h) => h.id === hackathonId);

  const ranked = useMemo(() => {
    if (!team) return [];
    return rankCandidates(
      builders.filter((b) => b.openToTeams),
      me,
      team,
      byId,
      hackathon,
      {
        minScore,
        role: role === "all" ? undefined : role,
        exclude: team.members.map((m) => m.builderId),
      },
    ).slice(0, 14);
  }, [builders, me, team, byId, hackathon, minScore, role]);

  const coverage = team ? teamCoverage(team, byId, hackathon) : null;
  const active = ranked.find((r) => r.builder.id === expanded) ?? ranked[0];

  if (!team)
    return (
      <EmptyState
        title="No active team yet"
        body="Matching scores a builder against the gaps in a specific team. Create or pick a team first."
        action={<Link href="/teams"><Button>Create a team</Button></Link>}
      />
    );

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHead
        index="02"
        kicker="Matching"
        title={<>Ranked by what they close, not who they resemble.</>}
        sub="Five weighted signals, scored against this event's track demands. Every point is traceable — open a candidate and inspect the breakdown."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={hackathonId}
              onChange={(e) => {
                const n = new URLSearchParams(params);
                n.set("hackathon", e.target.value);
                router.replace(`${pathname}?${n.toString()}`, { scroll: false });
              }}
              aria-label="Target hackathon"
              className="w-auto py-2 text-[12px]"
            >
              {hackathons
                .filter((h) => h.status !== "closed")
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} · {h.code}
                  </option>
                ))}
            </Select>
            <Select
              value={team.id}
              onChange={(e) => {
                setActiveTeam(e.target.value);
                const t = teams.find((x) => x.id === e.target.value);
                if (t) {
                  const n = new URLSearchParams(params);
                  n.set("hackathon", t.hackathonId);
                  router.replace(`${pathname}?${n.toString()}`, { scroll: false });
                }
              }}
              aria-label="Team"
              className="w-auto py-2 text-[12px]"
            >
              {teams.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <div className="flex gap-px border border-line bg-raised p-px">
          <button
            onClick={() => {
              const n = new URLSearchParams(params);
              n.delete("role");
              router.replace(`${pathname}?${n.toString()}`, { scroll: false });
            }}
            className={cn(
              "px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              role === "all" ? "bg-accent-soft text-accent" : "text-fg3 hover:text-fg",
            )}
          >
            any role
          </button>
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => {
                const n = new URLSearchParams(params);
                n.set("role", r);
                router.replace(`${pathname}?${n.toString()}`, { scroll: false });
              }}
              className={cn(
                "px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                role === r ? "bg-accent-soft text-accent" : "text-fg3 hover:text-fg",
              )}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Label tone="muted">min score</Label>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={minScore}
            aria-label="Minimum complement score"
            onChange={(e) => {
              const n = new URLSearchParams(params);
              if (e.target.value === "0") n.delete("min");
              else n.set("min", e.target.value);
              router.replace(`${pathname}?${n.toString()}`, { scroll: false });
            }}
            className="h-1 w-32 cursor-pointer appearance-none bg-hover accent-[var(--accent)]"
          />
          <span className="w-8 font-mono text-[12px] tnum text-fg">{minScore}</span>
        </div>
      </div>

      <div className="grid gap-8 py-8 lg:grid-cols-12">
        {/* candidate list */}
        <div className="lg:col-span-7">
          {coverage && coverage.hardGaps.length > 0 && (
            <Reveal className="mb-4 flex flex-wrap items-center gap-3 border border-amber-line bg-amber-soft px-4 py-3">
              <Label tone="amber">gaps driving this ranking</Label>
              <div className="flex flex-wrap gap-1.5">
                {coverage.hardGaps.map((c) => (
                  <Chip key={c} tone="amber">{CLUSTER_NAME[c]}</Chip>
                ))}
              </div>
            </Reveal>
          )}

          {ranked.length === 0 ? (
            <EmptyState
              title={`Nobody clears ${minScore}% with these filters`}
              body="Complement scores are computed against your team's actual gaps. Lowering the threshold widens the pool; changing the role filter changes which gaps get weighted."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    const n = new URLSearchParams(params);
                    n.delete("min");
                    n.delete("role");
                    router.replace(`${pathname}?${n.toString()}`, { scroll: false });
                  }}
                >
                  Reset filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-px">
              {ranked.map((c, i) => (
                <Reveal key={c.builder.id} delay={i * 45}>
                  <CandidateRow
                    c={c}
                    open={expanded === c.builder.id}
                    onToggle={() =>
                      setExpanded(expanded === c.builder.id ? null : c.builder.id)
                    }
                    onCompose={() => setComposing(c)}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>

        {/* score inspector */}
        <div className="lg:col-span-5">
          {active && (
            <div className="sticky top-20 space-y-6">
              <Reveal>
                <Panel ticks>
                  <div className="flex items-center justify-between border-b border-line px-5 py-3">
                    <Label tone="mint">score decomposition</Label>
                    <span className="font-mono text-[10px] text-fg3">{active.builder.id}</span>
                  </div>
                  <div className="flex items-center gap-4 border-b border-line px-5 py-4">
                    <Avatar b={active.builder} size={40} link={false} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] text-fg">{active.builder.name}</div>
                      <div className="font-mono text-[10px] text-fg3">
                        {ROLE_LABEL[active.builder.role as RoleKey]} · {active.builder.college}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[32px] leading-none tnum text-fg">
                        <CountUp to={active.total} duration={800} />
                      </div>
                      <div className="mono-label mt-1 text-mint">/ 100</div>
                    </div>
                  </div>

                  <div className="divide-y divide-line">
                    {active.signals.map((s, i) => (
                      <div key={s.id} className="px-5 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="flex items-center gap-2 text-[13px] text-fg">
                            <span className="font-mono text-[9px] text-fg3">
                              S-0{i + 1}
                            </span>
                            {s.label}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] tnum text-fg2">
                            <span className="text-fg3">w{s.weight.toFixed(2)}</span>
                            <span className="mx-1.5 text-fg3">×</span>
                            <span className="text-mint">{s.raw.toFixed(2)}</span>
                            <span className="ml-2 text-fg">{s.contribution.toFixed(2)}</span>
                          </span>
                        </div>
                        <div className="mt-2">
                          <Meter
                            value={(s.contribution / 0.34) * 100}
                            tone={i === 0 ? "mint" : "accent"}
                            delay={i * 80}
                          />
                        </div>
                        <p className="mt-2 text-[11.5px] leading-[1.55] text-fg3">
                          {SIGNAL_DETAIL[s.id]}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-4">
                    {active.fillsGaps.slice(0, 4).map((g) => (
                      <Chip key={g} tone="mint"><Check size={9} /> {g}</Chip>
                    ))}
                    {active.redundant.slice(0, 2).map((g) => (
                      <Chip key={g} tone="neutral">dup · {g}</Chip>
                    ))}
                  </div>
                </Panel>
              </Reveal>

              <Reveal delay={90}>
                <Panel>
                  <div className="border-b border-line px-5 py-3">
                    <Label tone="accent">skill vector vs team gap</Label>
                  </div>
                  <div className="px-4 py-4">
                    <ThemedRadar
                      height={250}
                      data={{
                        labels: CLUSTER_ORDER.map((c) => CLUSTER_NAME[c]),
                        datasets: [
                          {
                            label: active.builder.name.split(" ")[0],
                            data: CLUSTER_ORDER.map((c) => {
                              const b = active.builder;
                              return Math.min(3, b.skills.filter((s) => s.cluster === c).reduce((a, s) => a + s.level, 0));
                            }),
                            borderColor: t.mint,
                            backgroundColor: `${t.mint}26`,
                            pointBackgroundColor: t.mint,
                            borderWidth: 1.5,
                            pointRadius: 2,
                          },
                          {
                            label: "Team gap",
                            data: CLUSTER_ORDER.map((c) => 3 - Math.min(3, coverage?.byCluster[c] ?? 0)),
                            borderColor: t.amber,
                            backgroundColor: `${t.amber}20`,
                            pointBackgroundColor: t.amber,
                            borderWidth: 1.5,
                            borderDash: [3, 3],
                            pointRadius: 2,
                          },
                        ],
                      }}
                    />
                  </div>
                </Panel>
              </Reveal>

              <Reveal delay={130}>
                <Panel>
                  <div className="border-b border-line px-5 py-3">
                    <Label tone="accent">availability overlap</Label>
                  </div>
                  <div className="space-y-4 px-5 py-4">
                    <div>
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">
                        {active.builder.name.split(" ")[0]} · {active.builder.weeklyHours}h
                      </div>
                      <AvailabilityStrip b={active.builder} />
                    </div>
                    <div>
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">
                        you · {me.weeklyHours}h
                      </div>
                      <AvailabilityStrip b={me} />
                    </div>
                  </div>
                </Panel>
              </Reveal>
            </div>
          )}
        </div>
      </div>

      <RequestComposer
        candidate={composing}
        hackathonName={hackathon?.name ?? ""}
        onClose={() => setComposing(null)}
      />
    </div>
  );
}

function CandidateRow({
  c,
  open,
  onToggle,
  onCompose,
}: {
  c: ScoredCandidate;
  open: boolean;
  onToggle: () => void;
  onCompose: () => void;
}) {
  const b = c.builder;
  return (
    <div className={cn("border border-line bg-surface transition-colors", open && "border-accent-line")}>
      <button onClick={onToggle} className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-hover">
        <Avatar b={b} size={34} link={false} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/b/${b.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[14.5px] tracking-[-0.01em] text-fg transition-colors hover:text-accent"
            >
              {b.name}
            </Link>
            {b.studentCode && <Chip tone="accent">{b.studentCode}</Chip>}
            <Chip tone={roleTone[b.role as RoleKey]}>{ROLE_LABEL[b.role as RoleKey]}</Chip>
            {b.verified && <Chip tone="mint">verified</Chip>}
          </div>
          <div className="mt-1 font-mono text-[10px] text-fg3">
            {b.college} · {b.branch} · yr {b.year} · active {b.lastActive}
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-fg2">{c.reason}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {b.skills.filter((s) => s.level >= 2).slice(0, 4).map((s) => (
              <Chip key={s.id}>{s.label}</Chip>
            ))}
            <span className="ml-auto font-mono text-[10px] text-fg3">
              {b.weeklyHours}h / wk
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[24px] leading-none tnum text-fg">{c.total}</div>
          <div className="mono-label mt-1 text-mint">complement</div>
          <div className="mt-2 w-16">
            <Meter value={c.total} tone={c.total >= 85 ? "mint" : "accent"} />
          </div>
          <ChevronDown size={13} className={cn("ml-auto mt-2 text-fg3 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
              <div className="space-y-2">
                {c.signals.map((s, i) => (
                  <div key={s.id}>
                    <div className="flex justify-between font-mono text-[10px] text-fg3">
                      <span>{SIGNAL_LABEL[s.id]}</span>
                      <span className="tnum text-fg2">
                        {c.total > 0 ? ((s.contribution / c.total) * 100).toFixed(0) : "0"}%
                      </span>
                    </div>
                    <div className="mt-1">
                      <Meter value={(s.contribution / 0.34) * 100} tone={i === 0 ? "mint" : "accent"} delay={i * 60} height={2} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-between gap-3">
                <div>
                  <Label tone="muted">bio</Label>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-fg2">{b.bio}</p>
                  <div className="mt-3 space-y-1">
                    {b.projects.slice(0, 2).map((p) => (
                      <div key={p.id} className="flex justify-between gap-3 border-b border-line pb-1">
                        <span className="truncate text-[12px] text-fg">{p.name}</span>
                        <span className="shrink-0 font-mono text-[9px] text-fg3">{p.year}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={onCompose}>
                    <UserPlus size={12} /> Send request
                  </Button>
                  <Link href={`/b/${b.id}`}>
                    <Button size="sm" variant="outline">Profile</Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RequestComposer({
  candidate,
  hackathonName,
  onClose,
}: {
  candidate: ScoredCandidate | null;
  hackathonName: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<RoleKey>("ml");
  const [sending, setSending] = useState(false);
  const team = useActiveTeam();
  const me = useMe();
  const sendRequest = useApiStore((s) => s.sendRequest);
  const pushToast = useApiStore((s) => s.pushToast);

  return (
    <Modal open={!!candidate} onClose={onClose} title="collaboration request">
      {candidate && team && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 border border-line bg-raised px-3.5 py-3">
            <Avatar b={candidate.builder} size={32} link={false} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] text-fg">{candidate.builder.name}</div>
              <div className="font-mono text-[10px] text-fg3">
                complement {candidate.total}% · {hackathonName}
              </div>
            </div>
            <Sparkles size={14} className="text-mint" />
          </div>

          <Field label="Requested role">
            <Select value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="Message"
            hint={`${message.length} / 240 — say what you need them to build, not just that you'd like them.`}
          >
            <Textarea
              rows={4}
              maxLength={240}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`We're building for ${hackathonName} and ${team.name} is missing ${ROLE_LABEL[role].toLowerCase()}. ${candidate.fillsGaps[0] ? `You'd close our ${candidate.fillsGaps[0]} gap.` : ""}`}
            />
          </Field>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">
              from {me.name} · {team.name}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={sending}>Cancel</Button>
              <Button
                size="sm"
                disabled={message.trim().length < 12 || sending}
                onClick={async () => {
                  setSending(true);
                  try {
                    await sendRequest({
                      toUserId: candidate.builder.id,
                      teamId: team.id,
                      hackathonId: team.hackathonId ?? null,
                      message: message.trim(),
                      roleOffered: role,
                    });
                    setMessage("");
                    onClose();
                  } catch {
                    // error toast handled by store
                  } finally {
                    setSending(false);
                  }
                }}
              >
                {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Send request
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Public builder profile                                              */
/* ------------------------------------------------------------------ */
function BuilderProfile() {
  const { id } = useParams();
  const builders = useApiStore((s) => s.builders);
  const team = useActiveTeam();
  const hackathons = useApiStore((s) => s.hackathons);
  const me = useMe();
  const byId = useMemo(() => byIdMap(builders), [builders]);
  const t = useChartTokens();
  const [composing, setComposing] = useState(false);

  const b = builders.find((x) => x.id === id);
  if (!b)
    return (
      <EmptyState
        title="Profile not found"
        body="This builder may have made their profile private."
        action={<Link href="/match"><Button variant="outline">Back to matching</Button></Link>}
      />
    );

  const hackathon = hackathons.find((h) => h.id === team?.hackathonId);
  const scored =
    team && b.id !== me.id
      ? rankCandidates([b], me, team, byId, hackathon, {})[0]
      : null;

  const completeness = Math.round(
    (b.bio ? 15 : 0) +
      Math.min(30, b.skills.filter((s) => s.level > 0).length * 4) +
      Math.min(20, b.projects.length * 10) +
      Math.min(15, b.repos.length * 7) +
      (b.availability.length ? 12 : 0) +
      (b.verified ? 8 : 0),
  );

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/match"
        className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg3 transition-colors hover:text-accent"
      >
        <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-1" />
        Matching
      </Link>

      <Reveal className="mt-6 grid gap-6 border-b border-line pb-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 items-center justify-center border border-line bg-surface font-mono text-[18px] text-fg">
              {b.initials}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="display text-[clamp(1.7rem,3.4vw,2.4rem)] font-medium leading-tight text-fg">
                  {b.name}
                </h1>
                {b.verified && <Chip tone="mint">verified</Chip>}
                <Chip tone={roleTone[b.role as RoleKey]}>{ROLE_LABEL[b.role as RoleKey]}</Chip>
              </div>
              <div className="mt-2 font-mono text-[11px] text-fg3">
                {b.college} · {b.branch} · year {b.year} · {b.city} · active {b.lastActive}
              </div>
              <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-fg2">{b.bio}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 lg:col-span-4 lg:items-end">
          {scored ? (
            <div className="w-full border border-line bg-surface px-4 py-3.5 lg:w-auto">
              <div className="mono-label text-fg3">complement vs {team?.name}</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-mono text-[38px] leading-none tnum text-fg">
                  <CountUp to={scored.total} />
                </span>
                <span className="mono-label mb-1 text-mint">/ 100</span>
              </div>
              <p className="mt-2 text-[12px] text-fg2">{scored.reason}</p>
            </div>
          ) : (
            <div className="w-full border border-dashed border-line-strong px-4 py-3.5 text-[12.5px] text-fg2 lg:w-auto">
              No active team — complement score unavailable.
            </div>
          )}
          <Button onClick={() => setComposing(true)}>
            <UserPlus size={13} /> Send request
          </Button>
        </div>
      </Reveal>

      <div className="grid gap-6 py-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Panel>
            <div className="border-b border-line px-5 py-3">
              <Label tone="accent">skill vector</Label>
            </div>
            <div className="px-4 py-4">
              <ThemedRadar
                height={260}
                data={{
                  labels: CLUSTER_ORDER.map((c) => CLUSTER_NAME[c]),
                  datasets: [
                    {
                      label: b.name.split(" ")[0],
                      data: CLUSTER_ORDER.map((c) =>
                        Math.min(3, b.skills.filter((s) => s.cluster === c).reduce((a, s) => a + s.level, 0)),
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
            <div className="border-t border-line px-5 py-4">
              <CoverageLegend />
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-line px-5 py-3">
              <Label tone="accent">shipped work</Label>
            </div>
            <div className="divide-y divide-line">
              {b.projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="text-[13.5px] text-fg">{p.name}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-fg3">
                      {ROLE_LABEL[p.role as RoleKey]} · {p.outcome}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] tnum text-fg3">{p.year}</span>
                </div>
              ))}
              {b.repos.map((r) => (
                <div key={r.name} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="font-mono text-[12.5px] text-fg2">{r.name}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-fg3">{r.lang}</div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] tnum text-fg3">★ {r.stars}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Panel>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <Label tone="accent">weekly availability</Label>
              <span className="font-mono text-[10px] tnum text-fg3">{b.weeklyHours}h</span>
            </div>
            <div className="px-5 py-4">
              <AvailabilityStrip b={b} />
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-line px-5 py-3">
              <Label tone="accent">skills</Label>
            </div>
            <div className="flex flex-wrap gap-1.5 px-5 py-4">
              {b.skills.map((s) => (
                <Chip key={s.id} tone={s.level >= 3 ? "mint" : s.level >= 2 ? "accent" : "neutral"}>
                  {s.label} <span className="opacity-60">{s.level}</span>
                </Chip>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-line px-5 py-3">
              <Label tone="accent">hackathon history</Label>
            </div>
            <div className="divide-y divide-line">
              {b.events.length === 0 && (
                <p className="px-5 py-4 text-[12.5px] text-fg2">First hackathon this cycle.</p>
              )}
              {b.events.map((e, i) => {
                const h = hackathons.find((x) => x.id === e.hackathonId);
                return (
                  <div key={i} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="truncate text-[13px] text-fg">{h?.name ?? "—"}</span>
                    <span className="shrink-0 font-mono text-[10px] text-fg3">
                      {e.year}{e.placement ? ` · ${e.placement}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-line px-5 py-3">
              <Label tone="accent">profile completeness</Label>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[26px] tnum text-fg">{completeness}%</span>
                <span className="font-mono text-[10px] text-fg3">of signals usable</span>
              </div>
              <div className="mt-3">
                <Meter value={completeness} tone={completeness >= 75 ? "mint" : "amber"} />
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {composing && scored && (
        <RequestComposer
          candidate={scored}
          hackathonName={hackathon?.name ?? fmtDate(new Date().toISOString())}
          onClose={() => setComposing(false)}
        />
      )}
    </div>
  );
}
