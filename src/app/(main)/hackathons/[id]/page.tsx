"use client";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ArrowLeft, Bookmark, BookmarkCheck, Clock, MapPin, Sparkles } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useApiStore, byIdMap } from "@/client/store/apiStore";
import { getHackathon } from "@/client/lib/api/hackathons";
import type { Hackathon } from "@/client/types";
import { daysLeft } from "@/client/data/seed";
import {
  Avatar,
  CoverageMatrix,
  CoverageHead,
  CoverageLegend,
  EventStateChip,
  fmtDate,
  inr,
} from "@/components/shared";
import { teamCoverage } from "@/client/lib/matching";
import { ROLE_LABEL } from "@/client/types";
import {
  Button,
  Chip,
  CornerTicks,
  EmptyState,
  Label,
  Meter,
  Panel,
  Reveal,
  StateDot,
} from "@/components/ui";
import { ThemedBar, useChartTokens } from "@/components/charts";
import { cn } from "@/client/utils/cn";

function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => set((n) => n + 1), ms);
    return () => window.clearInterval(i);
  }, [ms]);
}

export default function HackathonDetail() {
  const { id } = useParams();
  const hackathons = useApiStore((s) => s.hackathons);
  const teams = useApiStore((s) => s.teams);
  const builders = useApiStore((s) => s.builders);
  const bookmarks = useApiStore((s) => s.bookmarks);
  const toggleBookmark = useApiStore((s) => s.toggleBookmark);
  const pushToast = useApiStore((s) => s.pushToast);
  const loadHackathons = useApiStore((s) => s.loadHackathons);
  const loadBuilders = useApiStore((s) => s.loadBuilders);
  const loadTeams = useApiStore((s) => s.loadTeams);

  useEffect(() => {
    if (hackathons.length === 0) loadHackathons();
    if (builders.length === 0) loadBuilders();
    if (teams.length === 0) loadTeams();
  }, [hackathons.length, builders.length, teams.length, loadHackathons, loadBuilders, loadTeams]);

  const t = useChartTokens();
  useTick();

  const byId = useMemo(() => byIdMap(builders), [builders]);

  const [singleH, setSingleH] = useState<Hackathon | null>(null);
  const [loadingH, setLoadingH] = useState(false);

  useEffect(() => {
    const found = hackathons.find((x) => x.id === id);
    if (!found) {
      setLoadingH(true);
      getHackathon(id as string).then(res => setSingleH(res)).catch(() => setSingleH(null)).finally(() => setLoadingH(false));
    }
  }, [id, hackathons]);

  const h = hackathons.find((x) => x.id === id) || singleH;
  
  if (loadingH || hackathons.length === 0) return <div className="p-12 text-center text-fg3">Loading hackathon...</div>;
  if (!h)
    return (
      <EmptyState
        title="That event isn't in the index"
        body="It may have closed or been removed by the organiser."
        action={<Link href="/discover"><Button variant="outline">Back to discovery</Button></Link>}
      />
    );

  const d = daysLeft(h);
  const saved = bookmarks.includes(h.id);
  const forming = teams.filter((tm) => tm.hackathonId === h.id);
  const looking = builders.filter((b) => b.openToTeams).slice(0, 8);

  const ms = new Date(h.registerDeadline).getTime() - Date.now();
  const dd = Math.max(0, Math.floor(ms / 86_400_000));
  const hh = Math.max(0, Math.floor((ms % 86_400_000) / 3_600_000));
  const mm = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  const ss = Math.max(0, Math.floor((ms % 60_000) / 1000));

  const stages = [
    { label: "Registration closes", date: h.registerDeadline, done: d < 0 },
    { label: "Event starts", date: h.startDate, done: false },
    {
      label: "Submission",
      date: new Date(new Date(h.startDate).getTime() + h.durationHours * 3_600_000).toISOString(),
      done: false,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link href="/discover"
        className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg3 transition-colors hover:text-accent"
      >
        <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-1" />
        Discovery index
      </Link>

      {/* editorial header */}
      <Reveal className="mt-6 grid gap-8 border-b border-line pb-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[11px] tnum text-fg3">{h.code}</span>
            <EventStateChip h={h} />
            <Chip tone="accent">{h.track}</Chip>
          </div>
          <h1 className="display mt-4 text-[clamp(2.1rem,5vw,3.6rem)] font-medium leading-[0.98] text-fg">
            {h.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-fg2">
            <span className="flex items-center gap-1.5"><MapPin size={11} /> {h.host}</span>
            <span className="flex items-center gap-1.5"><Clock size={11} /> {h.durationHours}h · {h.mode}</span>
            <span>{h.city}</span>
            <span className="text-fg">{inr(h.prize)}</span>
          </div>
        </div>
        <div className="flex flex-col items-start justify-end gap-3 lg:col-span-4 lg:items-end">
          <Button
            variant={saved ? "mint" : "outline"}
            onClick={() => {
              toggleBookmark(h.id);
              pushToast({
                label: saved ? "Bookmark removed" : "Bookmarked",
                body: saved ? `${h.name} removed from saved.` : `${h.name} saved · deadline tracking on.`,
                tone: "good",
              });
            }}
          >
            {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {saved ? "Saved" : "Bookmark event"}
          </Button>
          <Link href={`/match?hackathon=${h.id}`}>
            <Button variant="outline">
              <Sparkles size={13} /> Find teammates for this
            </Button>
          </Link>
          {h.registrationUrl && (
            <a href={h.registrationUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary">
                Register on Platform
              </Button>
            </a>
          )}
        </div>
      </Reveal>

      <div className="grid gap-8 py-8 lg:grid-cols-12">
        {/* left */}
        <div className="space-y-8 lg:col-span-7">
          <Reveal>
            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">problem statement brief</Label>
              </div>
              <p className="px-5 py-5 text-[14px] leading-[1.75] text-fg2">{h.description}</p>
              <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-4">
                {h.tracks.map((tr) => <Chip key={tr}>{tr}</Chip>)}
                <Chip>team cap {h.maxTeamSize}</Chip>
                <Chip>min {h.minTeamSize}</Chip>
                <Chip tone={h.demand === "high" ? "amber" : "neutral"}>demand {h.demand}</Chip>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={80}>
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">role demand by track</Label>
                <span className="font-mono text-[10px] tnum text-fg3">weight 0—100</span>
              </div>
              <div className="px-5 py-5">
                <ThemedBar
                  height={220}
                  horizontal
                  data={{
                    labels: Object.keys(h.trackDemands).map((k) => ROLE_LABEL[k as keyof typeof ROLE_LABEL]),
                    datasets: [
                      {
                        data: Object.values(h.trackDemands).map((v) => Math.round((v ?? 0) * 100)),
                        backgroundColor: Object.values(h.trackDemands).map((v) =>
                          (v ?? 0) >= 0.8 ? t.amber : t.accent,
                        ),
                        borderWidth: 0,
                        barThickness: 16,
                      },
                    ],
                  }}
                />
                <p className="mt-4 text-[12.5px] leading-relaxed text-fg2">
                  Amber bars are the roles this track leans on hardest. Matching weights your
                  team&apos;s gaps against exactly these, so a 94% complement here means something.
                </p>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={140}>
            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">timeline</Label>
              </div>
              <div className="px-5 py-5">
                <div className="relative">
                  <span className="absolute left-[5px] top-2 bottom-2 w-px bg-line" />
                  {stages.map((s, i) => (
                    <div key={s.label} className="relative flex items-center gap-4 pb-6 last:pb-0">
                      <span
                        className={cn(
                          "relative z-10 h-[11px] w-[11px] shrink-0 rounded-full border",
                          s.done ? "border-mint-line bg-mint" : i === 0 ? "border-accent bg-accent/40" : "border-line-strong bg-surface",
                        )}
                      >
                        {i === 0 && <span className="absolute inset-0 animate-pulse-dot rounded-full bg-accent/60" />}
                      </span>
                      <div>
                        <div className="text-[13.5px] text-fg">{s.label}</div>
                        <div className="mt-0.5 font-mono text-[10px] tnum text-fg3">{fmtDate(s.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* right inspector */}
        <div className="space-y-6 lg:col-span-5">
          <Reveal delay={60}>
            <div className="sticky top-20 space-y-6">
              <Panel ticks>
                <CornerTicks />
                <div className="border-b border-line px-5 py-3">
                  <Label tone="amber">registration closes in</Label>
                </div>
                <div className="grid grid-cols-4 divide-x divide-line">
                  {[
                    ["days", dd],
                    ["hrs", hh],
                    ["min", mm],
                    ["sec", ss],
                  ].map(([k, v]) => (
                    <div key={k as string} className="px-3 py-4 text-center">
                      <div className="font-mono text-[24px] tnum text-fg">
                        {String(v).padStart(2, "0")}
                      </div>
                      <div className="mono-label mt-1 text-fg3">{k}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-line px-5 py-3.5">
                  <Meter value={Math.max(4, 100 - d * 4)} tone={d <= 7 ? "amber" : "accent"} />
                  <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">
                    <span>cycle window</span>
                    <span className={d <= 7 ? "text-amber" : ""}>
                      {d <= 0 ? "closed" : `${d} days left`}
                    </span>
                  </div>
                </div>
              </Panel>

              <Panel>
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <Label tone="accent">teams forming here</Label>
                  <span className="font-mono text-[10px] tnum text-fg3">{forming.length}</span>
                </div>
                {forming.length === 0 ? (
                  <p className="px-5 py-5 text-[12.5px] text-fg2">
                    No HackMate teams registered yet for this event.
                  </p>
                ) : (
                  <div className="divide-y divide-line">
                    {forming.map((tm) => {
                      const cov = teamCoverage(tm, byId, h);
                      return (
                        <Link
                          key={tm.id}
                          href={`/teams/${tm.id}`}
                          className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-hover"
                        >
                          <div className="flex -space-x-1.5">
                            {tm.members.slice(0, 3).map((m) => {
                              const b = byId.get(m.builderId);
                              return b ? <Avatar key={m.builderId} b={b} size={24} link={false} /> : null;
                            })}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] text-fg">{tm.name}</div>
                            <div className="font-mono text-[10px] text-fg3">
                              {tm.members.length}/{h.maxTeamSize} · {tm.openSlots.length} open
                            </div>
                          </div>
                          <div className="w-16">
                            <Meter value={cov.overall} tone={cov.overall >= 85 ? "mint" : "amber"} />
                            <div className="mt-1 text-right font-mono text-[9px] tnum text-fg3">{cov.overall}%</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Panel>

              <Panel>
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <Label tone="accent">builders looking</Label>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-mint">
                    <StateDot tone="mint" pulse /> online
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 px-5 py-4">
                  {looking.map((b) => (
                    <Link
                      key={b.id}
                      href={`/b/${b.id}`}
                      className="group flex flex-col items-center gap-1.5 border border-line p-2 transition-colors hover:border-accent-line"
                    >
                      <span className="flex h-9 w-9 items-center justify-center border border-line bg-raised font-mono text-[11px] text-fg2 transition-colors group-hover:text-accent">
                        {b.initials}
                      </span>
                      <span className="w-full truncate text-center font-mono text-[9px] text-fg3">
                        {ROLE_LABEL[b.role]}
                      </span>
                    </Link>
                  ))}
                </div>
              </Panel>
            </div>
          </Reveal>
        </div>
      </div>

      {forming[0] && (
        <Reveal className="mt-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-3">
              <Label tone="accent">coverage · {forming[0].name}</Label>
              <CoverageHead coverage={teamCoverage(forming[0], byId, h)} />
            </div>
            <CoverageMatrix team={forming[0]} byId={byId} />
            <div className="border-t border-line px-5 py-4">
              <CoverageLegend />
            </div>
          </Panel>
        </Reveal>
      )}
    </div>
  );
}
