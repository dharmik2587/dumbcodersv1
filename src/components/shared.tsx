"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { cn } from "@/client/utils/cn";
import type { Builder, Hackathon, RoleKey, Team } from "@/client/types";
import { ROLE_LABEL } from "@/client/types";
import { CLUSTER_NAME, CLUSTER_ORDER } from "@/client/data/seed";
import {
  clusterLevels,
  gapClusters,
  type Coverage,
} from "@/client/lib/matching";
import { Chip, Ring, StateDot } from "./ui";

/* ---------------- formatters ---------------- */
export const inr = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
    : `₹${(n / 1000).toFixed(0)}K`;

export function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const roleTone: Record<RoleKey, "accent" | "mint" | "amber" | "violet" | "neutral"> = {
  frontend: "accent",
  backend: "mint",
  ml: "amber",
  design: "violet",
  product: "neutral",
  mobile: "mint",
  devops: "accent",
};

export const roleColor: Record<RoleKey, string> = {
  frontend: "var(--accent)",
  backend: "var(--mint)",
  ml: "var(--amber)",
  design: "var(--violet)",
  product: "var(--fg-2)",
  mobile: "var(--mint)",
  devops: "var(--accent)",
};

/* ---------------- avatar ---------------- */
export function Avatar({
  b,
  size = 28,
  link = true,
}: {
  b: Pick<Builder, "id" | "initials" | "name">;
  size?: number;
  link?: boolean;
}) {
  const el = (
    <span
      title={b.name}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="flex shrink-0 items-center justify-center border border-line bg-raised font-mono text-fg2 transition-colors group-hover:border-accent-line group-hover:text-accent"
    >
      {b.initials}
    </span>
  );
  return link ? <Link href={`/b/${b.id}`}>{el}</Link> : el;
}

import { Check } from "lucide-react";

/* ---------------- level control / skill tick ---------------- */
export const LEVEL_LABEL = ["none", "contribute", "ships", "owns it"];

export function LevelPicker({
  value,
  onChange,
  label,
}: {
  value: 0 | 1 | 2 | 3;
  onChange: (v: 0 | 1 | 2 | 3) => void;
  label: string;
}) {
  const isSelected = value > 0;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${label}: ${isSelected ? "skilled" : "not selected"}`}
      onClick={() => onChange(isSelected ? 0 : 3)}
      className={cn(
        "flex h-7 w-7 items-center justify-center border transition-all duration-150",
        isSelected
          ? "border-accent bg-accent text-canvas shadow-sm"
          : "border-line bg-raised text-transparent hover:border-line-strong hover:text-fg3/30"
      )}
    >
      <Check size={14} strokeWidth={3} className={isSelected ? "text-canvas" : ""} />
    </button>
  );
}

export function LevelCell({ level, gap, delay = 0 }: { level: number; gap?: boolean; delay?: number }) {
  if (gap)
    return (
      <span
        className="flex h-4 w-8 items-center justify-center border border-dashed border-amber-line"
        style={{ animation: `rise .5s cubic-bezier(.16,1,.3,1) ${delay}ms both` }}
        aria-label="team gap"
      >
        <span className="h-px w-3 bg-amber/60" />
      </span>
    );
  const cls = [
    "bg-hover border-line",
    "bg-accent/20 border-accent/25",
    "bg-accent/55 border-accent/40",
    "bg-accent border-accent",
  ][level];
  return (
    <span
      className={cn("block h-4 w-8 border", cls)}
      style={{ animation: `rise .5s cubic-bezier(.16,1,.3,1) ${delay}ms both` }}
      aria-label={`level ${level} — ${LEVEL_LABEL[level as 0 | 1 | 2 | 3]}`}
    />
  );
}

/* ---------------- availability grid & easy slot selector ---------------- */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SLOTS = [
  { id: "morning", label: "Morning", sub: "9am - 1pm", start: 9, end: 13 },
  { id: "afternoon", label: "Afternoon", sub: "1pm - 5pm", start: 13, end: 17 },
  { id: "evening", label: "Evening", sub: "5pm - 9pm", start: 17, end: 21 },
  { id: "night", label: "Night Owl", sub: "9pm - 1am", start: 21, end: 25 },
];

export function AvailabilityGrid({
  value,
  onChange,
  editable,
  compact,
}: {
  value: { day: number; start: number; end: number }[];
  onChange?: (v: { day: number; start: number; end: number }[]) => void;
  editable?: boolean;
  compact?: boolean;
}) {
  // Check if a day has any slots overlapping the given time interval
  const isSlotActive = (dayIdx: number, slotStart: number, slotEnd: number) => {
    return value.some((s) => s.day === dayIdx && s.start < slotEnd && s.end > slotStart);
  };

  const toggleSlot = (dayIdx: number, slotStart: number, slotEnd: number) => {
    if (!editable || !onChange) return;
    const active = isSlotActive(dayIdx, slotStart, slotEnd);
    let next: { day: number; start: number; end: number }[];
    if (active) {
      // Remove overlapping slots for this day & time
      next = value.filter(
        (s) => !(s.day === dayIdx && s.start === slotStart && s.end === (slotEnd === 25 ? 24 : slotEnd))
      );
    } else {
      // Add slot
      next = [
        ...value,
        { day: dayIdx, start: slotStart, end: slotEnd === 25 ? 24 : slotEnd },
      ];
    }
    onChange(next);
  };

  const totalHours = useMemo(() => {
    return value.reduce((acc, s) => acc + (s.end - s.start), 0);
  }, [value]);

  const activeDaysCount = useMemo(() => {
    const daysSet = new Set(value.map((s) => s.day));
    return daysSet.size;
  }, [value]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {DAYS.map((dayLabel, dIdx) => {
          const dayActiveCount = SLOTS.filter((slot) =>
            isSlotActive(dIdx, slot.start, slot.end)
          ).length;
          return (
            <div
              key={dayLabel}
              className={cn(
                "flex flex-col border border-line bg-raised/50 p-2.5 transition-colors",
                dayActiveCount > 0 && "border-line-strong bg-raised"
              )}
            >
              <div className="mb-2 flex items-center justify-between border-b border-line pb-1.5">
                <span className="font-mono text-[11px] font-medium text-fg">{dayLabel}</span>
                <span className="font-mono text-[9px] text-fg3">
                  {dayActiveCount > 0 ? `${dayActiveCount * 4}h` : "—"}
                </span>
              </div>
              <div className="space-y-1.5">
                {SLOTS.map((slot) => {
                  const on = isSlotActive(dIdx, slot.start, slot.end);
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!editable}
                      onClick={() => toggleSlot(dIdx, slot.start, slot.end)}
                      className={cn(
                        "flex w-full flex-col items-start px-2 py-1.5 text-left border transition-all text-[11px]",
                        on
                          ? "border-accent bg-accent text-canvas font-medium shadow-sm"
                          : "border-line/60 bg-surface/60 text-fg2 hover:border-line-strong hover:text-fg hover:bg-hover"
                      )}
                    >
                      <span className="leading-tight">{slot.label}</span>
                      <span className={cn("text-[9px] font-mono leading-none mt-0.5", on ? "text-canvas/80" : "text-fg3")}>
                        {slot.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 font-mono text-[10.5px]">
          <div className="flex items-center gap-2 text-fg3">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            <span>Click any day & slot to toggle availability</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-fg3">
              <span className="text-fg font-medium">{activeDaysCount}</span> days active
            </span>
            <span className="text-accent font-medium">
              ~{totalHours} hrs / week
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AvailabilityStrip({ b }: { b: Builder }) {
  const byDay = useMemo(() => {
    const n = Array(7).fill(0);
    b.availability.forEach((s) => (n[s.day] = s.end - s.start));
    return n;
  }, [b]);
  return (
    <div className="flex items-end gap-1">
      {byDay.map((h, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span
            className={cn(
              "h-4 w-full transition-colors",
              h === 0 ? "bg-hover" : h <= 2 ? "bg-accent/30" : h <= 4 ? "bg-accent/60" : "bg-accent",
            )}
            title={`${DAYS[i]} · ${h}h`}
          />
          <span className="font-mono text-[8px] text-fg3">{DAYS[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- coverage matrix ---------------- */
export function CoverageMatrix({
  team,
  byId,
  compact,
}: {
  team: Team;
  byId: Map<string, Builder>;
  compact?: boolean;
}) {
  const levels = clusterLevels(team, byId);
  const { hard } = gapClusters(levels);
  const clusters = compact ? CLUSTER_ORDER : CLUSTER_ORDER;

  return (
    <div className="scroll-x">
      <div className="min-w-[520px]">
        <div className="grid grid-cols-12 gap-2 border-b border-line px-4 py-2.5">
          <span className="mono-label col-span-4 text-fg3">Skill cluster</span>
          {team.members.map((m) => {
            const b = byId.get(m.builderId);
            return (
              <div key={m.builderId} className="col-span-2 flex flex-col items-center">
                <span className="max-w-full truncate font-mono text-[10px] text-fg">
                  {b?.name.split(" ")[0] ?? "?"}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg3">
                  {ROLE_LABEL[m.role as RoleKey]}
                </span>
              </div>
            );
          })}
          <div className="col-span-2 flex flex-col items-center">
            <span className="font-mono text-[10px] text-amber">Gap</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg3">
              unfilled
            </span>
          </div>
        </div>

        <div className="divide-y divide-line">
          {clusters.map((c, i) => {
            const isGap = hard.includes(c);
            return (
              <div key={c} className="grid grid-cols-12 items-center gap-2 px-4 py-[7px] transition-colors hover:bg-hover">
                <div className="col-span-4 flex items-center gap-2.5">
                  <span className="font-mono text-[9px] tnum text-fg3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("text-[12.5px]", isGap ? "text-amber" : "text-fg2")}>
                    {CLUSTER_NAME[c]}
                  </span>
                </div>
                {team.members.map((m, j) => {
                  const b = byId.get(m.builderId);
                  const lv = b
                    ? b.skills.filter((s) => s.cluster === c).reduce((a, s) => a + s.level, 0)
                    : 0;
                  return (
                    <div key={m.builderId} className="col-span-2 flex justify-center">
                      <LevelCell level={Math.min(3, lv)} delay={i * 35 + j * 50} />
                    </div>
                  );
                })}
                <div className="col-span-2 flex justify-center">
                  <LevelCell level={0} gap={isGap} delay={i * 35 + 200} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CoverageLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {[
        ["bg-accent", "3 — owns it"],
        ["bg-accent/55", "2 — ships with review"],
        ["bg-accent/20", "1 — can contribute"],
        ["border border-dashed border-amber-line", "0 — team gap"],
      ].map(([c, l]) => (
        <span key={l} className="flex items-center gap-2">
          <span className={cn("h-2.5 w-6 border border-line", c)} />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg3">{l}</span>
        </span>
      ))}
    </div>
  );
}

export function CoverageHead({
  coverage,
  target = 85,
}: {
  coverage: Coverage;
  target?: number;
}) {
  const tone = coverage.overall >= target ? "mint" : coverage.overall >= 60 ? "accent" : "amber";
  return (
    <div className="flex items-center gap-4">
      <Ring value={coverage.overall} tone={tone} size={52} />
      <div>
        <div className="mono-label text-fg3">roster coverage</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-fg2 tnum">
            target {target}%
          </span>
          {coverage.hardGaps.length > 0 ? (
            <Chip tone="amber">
              <StateDot tone="amber" />
              {coverage.hardGaps.length} hard gap{coverage.hardGaps.length > 1 ? "s" : ""}
            </Chip>
          ) : (
            <Chip tone="mint">
              <StateDot tone="mint" />
              no hard gaps
            </Chip>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- hackathon row bits ---------------- */
export function EventStateChip({ h }: { h: Hackathon }) {
  if (h.status === "closed")
    return <Chip tone="neutral">closed</Chip>;
  if (h.status === "closing")
    return (
      <Chip tone="amber">
        <StateDot tone="amber" pulse />
        closing
      </Chip>
    );
  return (
    <Chip tone="mint">
      <StateDot tone="mint" />
      open
    </Chip>
  );
}
