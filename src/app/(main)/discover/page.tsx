"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, ChevronDown, ExternalLink, FilterX, MapPin, Sparkles } from "lucide-react";
import { useApiStore } from "@/client/store/apiStore";
import { daysLeft } from "@/client/data/seed";
import { inr, EventStateChip, CoverageLegend, fmtDate } from "@/components/shared";
import {
  Button,
  Chip,
  EmptyState,
  Label,
  Panel,
  SectionHead,
  Select,
  Skeleton,
  Input,
} from "@/components/ui";
import { cn } from "@/client/utils/cn";
import type { Hackathon } from "@/client/types";
import { ThemedBar, useChartTokens } from "@/components/charts";

const MODES = ["all", "onsite", "remote", "hybrid"] as const;
const DEFAULT_TRACKS = ["Health", "Systems", "Open", "Fintech", "Devtools", "Climate", "Design", "EdTech", "Security", "AI", "Robotics", "Geo", "Hardware"];

export default function Discover() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hackathons = useApiStore((s) => s.hackathons);
  const bookmarks = useApiStore((s) => s.bookmarks);
  const toggleBookmark = useApiStore((s) => s.toggleBookmark);
  const loadHackathons = useApiStore((s) => s.loadHackathons);
  const pushToast = useApiStore((s) => s.pushToast);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"deadline" | "prize" | "demand">("deadline");

  // Load hackathons on mount and auto-refresh every 5 minutes from HackMate DB
  useEffect(() => {
    loadHackathons().then(() => setLoading(false));
    const interval = setInterval(() => {
      loadHackathons();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadHackathons]);

  const q = params.get("q") ?? "";
  const mode = params.get("mode") ?? "all";
  const track = params.get("track") ?? "all";
  const closing = params.get("closing") ?? "all";
  const size = params.get("size") ?? "all";
  const seeking = params.get("seeking") === "1";
  const savedOnly = params.get("saved") === "1";

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (v === null || v === "all" || v === "") next.delete(k);
    else next.set(k, v);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Build dynamic track list from actual hackathon data
  const TRACKS = useMemo(() => {
    const trackSet = new Set<string>();
    hackathons.forEach((h) => {
      h.tracks.forEach((t) => trackSet.add(t));
    });
    // Merge with defaults so the filter always has common tracks
    DEFAULT_TRACKS.forEach((t) => trackSet.add(t));
    return ["all", ...Array.from(trackSet).sort()];
  }, [hackathons]);

  const list = useMemo(() => {
    const demandRank = { high: 3, medium: 2, low: 1 };
    let out = hackathons.filter((h) => {
      if (h.status === "closed") return false;
      const term = q.toLowerCase();
      if (
        term &&
        !`${h.name} ${h.host} ${h.city} ${h.track}`.toLowerCase().includes(term)
      )
        return false;
      if (mode !== "all" && h.mode !== mode) return false;
      // Case-insensitive track matching with substring support
      if (track !== "all") {
        const trackLower = track.toLowerCase();
        const matchesTrack = h.tracks.some(
          (t) => t.toLowerCase() === trackLower || t.toLowerCase().includes(trackLower) || trackLower.includes(t.toLowerCase())
        );
        if (!matchesTrack) return false;
      }
      if (closing !== "all") {
        const d = daysLeft(h);
        if (closing === "7" && !(d >= 0 && d <= 7)) return false;
        if (closing === "14" && !(d >= 0 && d <= 14)) return false;
      }
      if (size !== "all" && h.maxTeamSize !== Number(size)) return false;
      if (seeking && h.demand === "low") return false;
      if (savedOnly && !bookmarks.includes(h.id)) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sortBy === "prize") return b.prize - a.prize;
      if (sortBy === "demand") return demandRank[b.demand] - demandRank[a.demand];
      return daysLeft(a) - daysLeft(b);
    });
    return out;
  }, [hackathons, q, mode, track, closing, size, seeking, savedOnly, bookmarks, sortBy]);

  const activeFilters = [mode !== "all", track !== "all", closing !== "all", size !== "all", seeking, savedOnly, !!q].filter(Boolean).length;

  const refreshHackathons = useApiStore((s) => s.refreshHackathons);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reload = async () => {
    setIsRefreshing(true);
    setLoading(true);
    await refreshHackathons();
    setLoading(false);
    setIsRefreshing(false);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHead
        index="01"
        kicker="Discovery"
        title={
          <>
            Every hackathon worth travelling for, in one index.
          </>
        }
        sub="Filter by track, format, team cap and how close the deadline is. Bookmark an event and matching starts ranking teammates for it immediately."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Label tone="muted">
              showing <span className="text-fg tnum">{list.length}</span> /{" "}
              <span className="tnum">{hackathons.length}</span>
            </Label>
            <Button variant="outline" size="sm" onClick={reload} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh index'}
            </Button>
          </div>
        }
      />

      {/* filter bar */}
      <div className="sticky top-14 z-20 -mx-4 mt-6 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-xl md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Input
              value={q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Search name, host, city, track…"
              aria-label="Search hackathons"
              className="pl-3 pr-3 py-2 font-mono text-[12px]"
            />
          </div>
          <div className="flex gap-px border border-line bg-raised p-px">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => set("mode", m)}
                className={cn(
                  "px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                  mode === m ? "bg-accent-soft text-accent" : "text-fg3 hover:text-fg",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <Select value={track} onChange={(e) => set("track", e.target.value)} aria-label="Track" className="w-auto py-2 text-[12px]">
            {TRACKS.map((t) => (
              <option key={t} value={t}>{t === "all" ? "All tracks" : t}</option>
            ))}
          </Select>
          <Select value={closing} onChange={(e) => set("closing", e.target.value)} aria-label="Deadline" className="w-auto py-2 text-[12px]">
            <option value="all">Any deadline</option>
            <option value="7">Closing ≤ 7 days</option>
            <option value="14">Closing ≤ 14 days</option>
          </Select>
          <Select value={size} onChange={(e) => set("size", e.target.value)} aria-label="Team size" className="w-auto py-2 text-[12px]">
            <option value="all">Any team cap</option>
            {[3, 4, 5].map((n) => (
              <option key={n} value={n}>Max {n}</option>
            ))}
          </Select>
          <button
            onClick={() => set("seeking", seeking ? null : "1")}
            className={cn(
              "border px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              seeking ? "border-accent-line bg-accent-soft text-accent" : "border-line text-fg3 hover:text-fg",
            )}
          >
            Seeking teammates
          </button>
          <button
            onClick={() => set("saved", savedOnly ? null : "1")}
            className={cn(
              "flex items-center gap-1.5 border px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              savedOnly ? "border-accent-line bg-accent-soft text-accent" : "border-line text-fg3 hover:text-fg",
            )}
          >
            <Bookmark size={11} /> Saved {bookmarks.length}
          </button>
          {activeFilters > 0 && (
            <button
              onClick={() => router.replace(pathname, { scroll: false })}
              className="flex items-center gap-1.5 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg3 transition-colors hover:text-danger"
            >
              <FilterX size={11} /> Clear {activeFilters}
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Label tone="muted" className="hidden lg:inline-flex">sort</Label>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort results"
              className="w-auto py-2 text-[12px]"
            >
              <option value="deadline">Deadline</option>
              <option value="prize">Prize</option>
              <option value="demand">Teammate demand</option>
            </Select>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-line py-4">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="Nothing matches this combination"
            body="The index holds 24 events this cycle. Loosen the deadline or track filter, or clear everything and browse."
            action={
              <Button variant="outline" onClick={() => router.replace(pathname, { scroll: false })}>
                Clear all filters
              </Button>
            }
          />
        ) : (
          <Panel>
            <div className="hidden grid-cols-12 gap-4 border-b border-line px-5 py-2.5 lg:grid">
              <Label className="col-span-4">Event</Label>
              <Label className="col-span-2">Format</Label>
              <Label className="col-span-2">Closes</Label>
              <Label className="col-span-2">Prize</Label>
              <Label className="col-span-1 text-right">Save</Label>
            </div>
            {list.map((h, i) => (
              <EventRow
                key={h.id}
                h={h}
                index={i}
                saved={bookmarks.includes(h.id)}
                open={open === h.id}
                onSave={() => {
                  toggleBookmark(h.id);
                  pushToast({
                    label: bookmarks.includes(h.id) ? "Bookmark removed" : "Bookmarked",
                    body: bookmarks.includes(h.id)
                      ? `${h.name} removed from your saved list.`
                      : `${h.name} saved · matching will rank teammates for it.`,
                    tone: "good",
                  });
                }}
                onOpen={() => setOpen(open === h.id ? null : h.id)}
              />
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-raised px-5 py-3">
              <Label tone="muted">index refreshed hourly</Label>
              <span className="font-mono text-[10px] tnum text-fg3">2026-03-08 09:41 IST</span>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function EventRow({
  h,
  index,
  saved,
  open,
  onSave,
  onOpen,
}: {
  h: Hackathon;
  index: number;
  saved: boolean;
  open: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const d = daysLeft(h);
  const urgent = d >= 0 && d <= 7;
  const t = useChartTokens();
  const teams = useApiStore((s) => s.teams);
  const builders = useApiStore((s) => s.builders);
  const here = teams.filter((tm) => tm.hackathonId === h.id);
  const byId = useMemo(() => {
    const map = new Map<string, any>();
    builders.forEach((b) => map.set(b.id, b));
    return map;
  }, [builders]);

  return (
    <motion.div layout className={cn("border-b border-line last:border-0", open && "bg-raised")}>
      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-raised lg:grid-cols-12">
        <div className="col-span-2 lg:col-span-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tnum text-fg3">{h.code}</span>
            <EventStateChip h={h} />
          </div>
          <Link href={`/hackathons/${h.id}`}
            className="mt-1.5 block text-[16px] tracking-[-0.02em] text-fg transition-colors hover:text-accent"
          >
            {h.name}
          </Link>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-fg3">
            <MapPin size={9} /> {h.host} · {h.city}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="font-mono text-[11px] capitalize text-fg2">
            {h.mode} · {h.durationHours}h
          </div>
          <div className="mt-1 font-mono text-[10px] text-fg3">{h.track}</div>
        </div>

        <div className="lg:col-span-2">
          <div className={cn("font-mono text-[13px] tnum", urgent ? "text-amber" : "text-fg")}>
            {h.status === "closed" ? "—" : `T-${d}d`}
          </div>
          <div className="mt-1 font-mono text-[10px] tnum text-fg3">{fmtDate(h.registerDeadline)}</div>
        </div>

        <div className="lg:col-span-2">
          <div className="font-mono text-[12px] tnum text-fg">{inr(h.prize)}</div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-fg3">
            demand ·
            <span className={cn(h.demand === "high" && "text-amber", h.demand === "medium" && "text-fg2")}>
              {h.demand}
            </span>
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-end gap-2 lg:col-span-2">
          <button
            onClick={onOpen}
            className="flex items-center gap-1 border border-line px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fg3 transition-colors hover:border-accent-line hover:text-accent"
          >
            detail
            <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
          </button>
          <button
            onClick={onSave}
            aria-label={saved ? `Remove ${h.name} bookmark` : `Bookmark ${h.name}`}
            aria-pressed={saved}
            className={cn(
              "flex h-8 w-8 items-center justify-center border transition-all duration-200 hover:scale-105",
              saved
                ? "border-accent bg-accent text-accent-ink"
                : "border-line text-fg3 hover:border-line-strong hover:text-fg",
            )}
          >
            {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
        </div>
      </div>

      <div className="grid transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)]" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="grid gap-6 border-t border-line px-5 py-5 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Label tone="muted">about</Label>
              <p className="mt-3 text-[13px] leading-[1.7] text-fg2">{h.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {h.tracks.map((tr) => (
                  <Chip key={tr}>{tr}</Chip>
                ))}
                <Chip>cap {h.maxTeamSize}</Chip>
                <Chip>min {h.minTeamSize}</Chip>
              </div>
            </div>
            <div className="lg:col-span-4">
              <Label tone="muted">what this track demands</Label>
              <div className="mt-3">
                <ThemedBar
                  height={150}
                  horizontal
                  data={{
                    labels: Object.keys(h.trackDemands),
                    datasets: [
                      {
                        data: Object.values(h.trackDemands).map((v) => Math.round((v ?? 0) * 100)),
                        backgroundColor: Object.keys(h.trackDemands).map((k) =>
                          k === "ml" || k === "design" ? t.amber : t.accent,
                        ),
                        borderWidth: 0,
                        barThickness: 11,
                      },
                    ],
                  }}
                />
              </div>
            </div>
            <div className="lg:col-span-3">
              <Label tone="muted">teams forming here</Label>
              <div className="mt-3 space-y-2">
                {here.length === 0 && (
                  <p className="text-[12.5px] text-fg3">
                    No HackMate teams yet — be the first to register one.
                  </p>
                )}
                {here.map((tm) => {
                  const cov = coverageOf(tm, byId, h);
                  return (
                    <Link
                      key={tm.id}
                      href={`/teams/${tm.id}`}
                      className="flex items-center justify-between gap-3 border border-line bg-surface px-3 py-2 transition-colors hover:border-accent-line"
                    >
                      <span className="truncate text-[12.5px] text-fg">{tm.name}</span>
                      <span className="font-mono text-[10px] tnum text-fg3">{cov}%</span>
                    </Link>
                  );
                })}
              </div>
              <Link href={`/match?hackathon=${h.id}`}>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  <Sparkles size={12} /> Find teammates
                </Button>
              </Link>
              {h.registrationUrl && (
                <a
                  href={`/api/hackathons/${h.id}/register`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="primary" size="sm" className="mt-2 w-full group">
                    <ExternalLink size={12} className="transition-transform group-hover:translate-x-0.5" />
                    Register on Unstop
                  </Button>
                </a>
              )}
            </div>
          </div>
          {index === 0 && (
            <div className="border-t border-line px-5 py-4">
              <CoverageLegend />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function coverageOf(team: { members: { builderId: string }[] }, byId: Map<string, import("@/client/types").Builder>, h: Hackathon) {
  const levels: Record<string, number> = {};
  for (const m of team.members) {
    const b = byId.get(m.builderId);
    if (!b) continue;
    for (const s of b.skills) levels[s.cluster] = Math.min(3, (levels[s.cluster] ?? 0) + s.level);
  }
  const demanded = new Set(
    Object.entries(h.trackDemands)
      .filter(([, v]) => (v ?? 0) >= 0.6)
      .map(([k]) => k),
  );
  const order = ["interface", "services", "infra", "intelligence", "craft", "narrative", "mobile"];
  let sum = 0;
  let w = 0;
  for (const c of order) {
    const weight = demanded.size && !demanded.has(c) ? 1 : 2;
    sum += ((levels[c] ?? 0) / 3) * weight;
    w += weight;
  }
  return Math.round((sum / w) * 100);
}


