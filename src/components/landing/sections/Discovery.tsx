'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { Kicker, Reveal } from "../lib/kit";
import { hackathons, type Hackathon } from "../lib/content";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All events" },
  { id: "closing", label: "Closing < 7d" },
  { id: "remote", label: "Remote / hybrid" },
  { id: "demand", label: "Seeking teammates" },
];

export function Discovery() {
  const [filter, setFilter] = useState("all");
  const [saved, setSaved] = useState<string[]>(["HK-2041"]);
  const [open, setOpen] = useState<string | null>("HK-2041");

  const list = useMemo(
    () =>
      hackathons.filter((h) => {
        if (filter === "closing") return h.daysLeft > 0 && h.daysLeft <= 7;
        if (filter === "remote") return h.mode !== "Onsite · 36h" && h.mode !== "Onsite · 30h" && h.mode !== "Onsite · 24h";
        if (filter === "demand") return h.demand !== "low";
        return true;
      }),
    [filter],
  );

  const toggleSave = (code: string) =>
    setSaved((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]));

  return (
    <section
      id="discovery"
      data-zone="dark"
      className="relative border-t border-white/10 bg-ink-950 py-24 md:py-32"
    >
      <div className="dotfield pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Reveal>
              <Kicker tone="beam">05 / Discovery</Kicker>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 text-[clamp(2rem,4.2vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.04em] text-white">
                Every hackathon worth travelling for, in one index.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 max-w-sm text-[15px] leading-[1.7] text-slate-400">
                Filter by track, travel, team-size cap and deadline. Bookmark an event and
                HackMate starts ranking teammates for it the same day — before registrations
                close and the group chats go quiet.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-8 flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-all",
                      filter === f.id
                        ? "border-beam bg-beam text-white shadow-[0_0_12px_rgba(79,140,255,0.4)]"
                        : "border-white/10 text-slate-400 bg-ink-900/60 hover:border-white/30 hover:text-white",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </Reveal>
            <Reveal delay={280}>
              <div className="mt-8 space-y-2 border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-[0.14em]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Showing</span>
                  <span className="tnum text-white">
                    {list.length} / {hackathons.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bookmarked</span>
                  <span className="tnum text-beam">{saved.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Source</span>
                  <span className="text-slate-300">Campus reps + organisers</span>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/discover"
                  className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-beam hover:underline"
                >
                  Open full hackathon directory →
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <Reveal delay={120}>
              <div className="border border-white/10 bg-ink-900/70 backdrop-blur-sm">
                <div className="hidden grid-cols-12 gap-4 border-b border-white/10 px-5 py-3 md:grid bg-ink-900">
                  <span className="mono-label col-span-4 text-slate-500">Event</span>
                  <span className="mono-label col-span-3 text-slate-500">Format</span>
                  <span className="mono-label col-span-2 text-slate-500">Closes</span>
                  <span className="mono-label col-span-2 text-slate-500">Prize</span>
                  <span className="mono-label col-span-1 text-right text-slate-500">Save</span>
                </div>

                {list.map((h, i) => (
                  <DiscoveryRow
                    key={h.code}
                    h={h}
                    index={i}
                    saved={saved.includes(h.code)}
                    open={open === h.code}
                    onSave={() => toggleSave(h.code)}
                    onOpen={() => setOpen(open === h.code ? null : h.code)}
                  />
                ))}

                {list.length === 0 && (
                  <div className="px-5 py-16 text-center">
                    <div className="mono-label text-slate-400">
                      No events match this filter
                    </div>
                    <button
                      onClick={() => setFilter("all")}
                      className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-beam"
                    >
                      Reset index
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-white/10 bg-ink-950 px-5 py-3.5">
                  <span className="mono-label text-slate-500">
                    Index refreshed hourly
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 tnum">
                    2026-03-08 09:41 IST
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscoveryRow({
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
  const closed = h.state === "closed";
  const urgent = h.daysLeft > 0 && h.daysLeft <= 7;

  return (
    <div className={cn("border-b border-white/10 last:border-0", open && "bg-ink-850/80")}>
      <button
        onClick={onOpen}
        className="grid w-full grid-cols-2 items-center gap-x-4 gap-y-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.03] md:grid-cols-12"
      >
        <div className="col-span-2 md:col-span-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tnum text-slate-500">{h.code}</span>
            <span
              className={cn(
                "mono-label px-1.5 py-0.5 border",
                closed
                  ? "border-white/10 text-slate-500"
                  : urgent
                    ? "border-amber/50 bg-amber/10 text-amber"
                    : "border-mint/50 bg-mint/10 text-mint",
              )}
            >
              {closed ? "closed" : urgent ? "closing" : "open"}
            </span>
          </div>
          <div className="mt-1.5 text-[16px] tracking-[-0.02em] text-white font-medium">
            {h.name}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-slate-400">
            {h.host} · {h.city}
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="font-mono text-[11px] text-slate-200">{h.mode}</div>
          <div className="mt-1 font-mono text-[10px] text-slate-400">{h.track}</div>
        </div>

        <div className="md:col-span-2">
          <div
            className={cn(
              "font-mono text-[13px] tnum",
              urgent ? "text-amber" : "text-slate-200",
            )}
          >
            {closed ? "—" : `T-${h.daysLeft}d`}
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">{h.closes}</div>
        </div>

        <div className="md:col-span-2">
          <div className="font-mono text-[12px] tnum text-slate-200">{h.prize}</div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">
            demand · {h.demand}
          </div>
        </div>

        <div className="flex justify-end md:col-span-1">
          <span
            role="checkbox"
            aria-checked={saved}
            aria-label={`Bookmark ${h.name}`}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                onSave();
              }
            }}
            className={cn(
              "flex h-7 w-7 cursor-pointer items-center justify-center border transition-colors",
              saved
                ? "border-beam bg-beam text-white shadow-[0_0_8px_rgba(79,140,255,0.6)]"
                : "border-white/15 text-slate-400 hover:border-white/40 hover:text-white",
            )}
          >
            <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
              <path
                d="M1 1h9v11L5.5 9 1 12z"
                stroke="currentColor"
                strokeWidth="1.3"
                fill={saved ? "currentColor" : "none"}
              />
            </svg>
          </span>
        </div>
      </button>

      <div
        className="grid transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 gap-6 border-t border-white/10 px-5 py-5 md:grid-cols-3 bg-ink-950/60">
            {[
              {
                k: "Builders looking",
                v: ["14", "31", "07", "19"][index % 4],
                d: "open to a team for this event",
              },
              {
                k: "Most needed role",
                v: ["AI / ML", "Backend", "Design", "Frontend"][index % 4],
                d: "largest gap across registered teams",
              },
              {
                k: "Median team size",
                v: ["3.4", "3.1", "2.8", "3.9"][index % 4],
                d: "of 4 allowed",
              },
            ].map((s) => (
              <div key={s.k}>
                <div className="mono-label text-slate-500">{s.k}</div>
                <div className="mt-2 text-[24px] font-medium tracking-[-0.03em] text-white tnum">
                  {s.v}
                </div>
                <div className="mt-1 text-[12px] leading-snug text-slate-400">
                  {s.d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
