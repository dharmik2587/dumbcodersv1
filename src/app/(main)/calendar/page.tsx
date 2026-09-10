"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";

import { ChevronLeft, ChevronRight, ShieldCheck, Bookmark } from "lucide-react";
import { useStore } from "@/client/store/useStore";
import { useApiStore } from "@/client/store/apiStore";
import { EventStateChip, fmtDate, inr, Avatar } from "@/components/shared";
import { daysLeft } from "@/client/data/seed";
import {
  Button,
  Chip,
  Label,
  Panel,
  Reveal,
  SectionHead,
  Select,
  Skeleton,
  StateDot,
  Toggle,
} from "@/components/ui";
import { cn } from "@/client/utils/cn";



/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */
function Calendar() {
  const hackathons = useApiStore((s) => s.hackathons);
  const bookmarks = useApiStore((s) => s.bookmarks);
  const [cursor, setCursor] = useState(() => new Date());
  const [onlySaved, setOnlySaved] = useState(false);
  const [selected, setSelected] = useState(8); // day of month

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map: Record<number, typeof hackathons> = {};
    hackathons.forEach((h) => {
      if (onlySaved && !bookmarks.includes(h.id)) return;
      const hObj = h as { registrationDeadlineAt?: string; registerDeadline?: string };
      const dStr = hObj.registrationDeadlineAt || hObj.registerDeadline;
      if (!dStr) return;
      const d = new Date(dStr);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const k = d.getDate();
      map[k] = [...(map[k] ?? []), h];
    });
    return map;
  }, [hackathons, bookmarks, onlySaved, year, month]);

  const monthName = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const dayEvents = byDay[selected] ?? [];

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHead
        index="06"
        kicker="Calendar"
        title={<>Deadlines you can see coming.</>}
        sub="Registration closes, not the event date — that's the one that quietly kills a team."
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlySaved((v) => !v)}
              className={cn(
                "border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                onlySaved ? "border-accent-line bg-accent-soft text-accent" : "border-line text-fg3 hover:text-fg",
              )}
            >
              bookmarked only
            </button>
            <div className="flex gap-px border border-line bg-raised p-px">
              <button
                aria-label="Previous month"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="flex h-8 w-8 items-center justify-center text-fg3 transition-colors hover:text-fg"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="flex h-8 items-center px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-fg2">
                {monthName}
              </span>
              <button
                aria-label="Next month"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="flex h-8 w-8 items-center justify-center text-fg3 transition-colors hover:text-fg"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        }
      />

      <div className="grid gap-6 py-8 lg:grid-cols-12">
        <Reveal className="lg:col-span-8">
          <Panel>
            <div className="grid grid-cols-7 border-b border-line">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <div key={i} className="border-r border-line px-3 py-2 last:border-0">
                  <span className="mono-label text-fg3">{d}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: startPad }, (_, i) => (
                <div key={`pad-${i}`} className="min-h-[92px] border-b border-r border-line bg-raised/40 last:border-r-0" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const events = byDay[day] ?? [];
                const isToday = year === 2026 && month === 2 && day === 8;
                const isSel = day === selected;
                return (
                  <button
                    key={day}
                    onClick={() => setSelected(day)}
                    className={cn(
                      "group relative min-h-[92px] border-b border-r border-line p-2 text-left transition-colors last:border-r-0",
                      isSel ? "bg-accent-soft" : "hover:bg-hover",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[11px] tnum",
                        isToday ? "text-accent" : isSel ? "text-fg" : "text-fg3",
                      )}
                    >
                      {String(day).padStart(2, "0")}
                    </span>
                    {isToday && (
                      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full ring-2 ring-accent" />
                    )}
                    <span className="mt-2 flex flex-col gap-1">
                      {events.slice(0, 3).map((e: import('@/client/types').Hackathon) => {
                        const isBookmarked = bookmarks.includes(e.id);
                        return (
                          <span
                            key={e.id}
                            className={cn(
                              "flex items-center gap-1 truncate border-l-2 pl-1.5 font-mono text-[9px]",
                              isBookmarked ? "border-blue-500 text-blue-600 font-medium bg-blue-50/50" : 
                              e.status === "closing"
                                ? "border-amber text-amber"
                                : e.status === "closed"
                                  ? "border-line-strong text-fg3"
                                  : "border-mint text-fg2",
                            )}
                          >
                            {isBookmarked && <Bookmark size={8} className="text-blue-500 fill-blue-500" />}
                            {e.name}
                          </span>
                        );
                      })}
                      {events.length > 3 && (
                        <span className="font-mono text-[9px] text-fg3">
                          +{events.length - 3} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={80} className="lg:col-span-4">
          <div className="sticky top-20 space-y-6">
            <Panel ticks>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">
                  {String(selected).padStart(2, "0")} {monthName.split(" ")[0]}
                </Label>
                <span className="font-mono text-[10px] tnum text-fg3">{dayEvents.length}</span>
              </div>
              {dayEvents.length === 0 ? (
                <p className="px-5 py-6 text-center text-[12.5px] text-fg2">
                  No registration deadlines on this day.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {dayEvents.map((h: import('@/client/types').Hackathon) => {
                    const d = daysLeft(h);
                    const isBookmarked = bookmarks.includes(h.id);
                    return (
                      <Link
                        key={h.id}
                        href={`/hackathons/${h.id}`}
                        className={cn("block px-5 py-4 transition-colors hover:bg-hover", isBookmarked && "bg-blue-50/10")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 truncate text-[14px] text-fg">
                            {isBookmarked && <Bookmark size={12} className="text-blue-500 fill-blue-500" />}
                            {h.name}
                          </span>
                          <EventStateChip h={h} />
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-fg3">
                          {h.host} · {h.city}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className={cn("font-mono text-[11px] tnum", d <= 7 ? "text-amber" : "text-fg2")}>
                            {d < 0 ? "closed" : `T-${d}d`}
                          </span>
                          <span className="font-mono text-[11px] tnum text-fg3">{inr(h.prize)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel>
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">legend</Label>
              </div>
              <div className="space-y-2.5 px-5 py-4">
                {[
                  ["mint", "open registration"],
                  ["amber", "closing within 7 days"],
                  ["muted", "closed"],
                ].map(([tone, label]) => (
                  <div key={label as string} className="flex items-center gap-3">
                    <StateDot tone={tone as "mint" | "amber" | "muted"} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg3">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */
function Settings() {
  const prefs = useStore((s) => s.prefs);
  const setPref = useStore((s) => s.setPref);
  const pushToast = useApiStore((s) => s.pushToast);

  const groups: { title: string; note: string; items: [keyof typeof prefs, string, string][] }[] = [
    {
      title: "Notifications",
      note: "What lands in your activity feed.",
      items: [
        ["notifyRequests", "Request activity", "New, accepted and declined collaboration requests."],
        ["notifyDeadlines", "Deadline reminders", "Seven days, 48 hours and 6 hours before registration closes."],
        ["notifyMatches", "New complements", "When someone new clears 80% against your active team."],
      ],
    },
    {
      title: "Privacy",
      note: "Who can find you and what they see.",
      items: [
        ["discoverable", "Discoverable profile", "Show up in other teams' matching results."],
        ["showCollege", "Show college", "Display your institution on your public profile."],
        ["showRepos", "Show repositories", "Include linked repos in your build-history signal."],
        ["allowRequests", "Allow requests", "Let builders send you collaboration requests."],
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-[900px]">
      <SectionHead
        index="07"
        kicker="Settings"
        title={<>Account and what you share.</>}
        sub="Dark mode is always on."
      />

      <div className="space-y-6 py-8">
        <Reveal>
          <Panel ticks>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <Label tone="accent">appearance</Label>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">
                active · dark
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
              <div>
                <div className="text-[14px] text-fg">Colour theme</div>
                <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-fg2">
                  Dark mode is always on. Every surface, chart, scrollbar and focus ring is designed for dark.
                </p>
              </div>
              <Chip tone="accent">Dark</Chip>
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
              {[
                ["accent", "--accent"],
                ["mint", "--mint"],
                ["amber", "--amber"],
                ["surface", "--bg-1"],
              ].map(([label, token]) => (
                <div key={label as string} className="bg-surface px-4 py-3">
                  <div
                    className="h-8 w-full border border-line"
                    style={{ background: `var(${token})` }}
                  />
                  <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-fg3">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Reveal>

        {groups.map((g, gi) => (
          <Reveal key={g.title} delay={gi * 70}>
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">{g.title.toLowerCase()}</Label>
                <ShieldCheck size={13} className="text-fg3" />
              </div>
              <p className="px-5 pt-4 text-[12.5px] text-fg2">{g.note}</p>
              <div className="divide-y divide-line px-5">
                {g.items.map(([key, label, desc]) => (
                  <div key={key} className="flex items-start justify-between gap-6 py-4">
                    <div>
                      <div className="text-[13.5px] text-fg">{label}</div>
                      <p className="mt-1 max-w-md text-[12px] leading-relaxed text-fg3">{desc}</p>
                    </div>
                    <Toggle
                      label={label}
                      checked={prefs[key]}
                      onChange={(v) => {
                        setPref(key, v);
                        pushToast({
                          label: v ? "Enabled" : "Disabled",
                          body: label,
                          tone: "info",
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>
        ))}

        <Reveal delay={160}>
          <Panel>
            <div className="border-b border-line px-5 py-3">
              <Label tone="accent">account</Label>
            </div>
            <div className="px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <div className="text-[13.5px] text-fg">you@college.edu</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Chip tone="mint">
                      <StateDot tone="mint" /> verified
                    </Chip>
                    <span className="font-mono text-[10px] text-fg3">joined Jan 2026</span>
                  </div>
                </div>
                <Link href="/profile">
                  <Button size="sm" variant="outline">Edit profile</Button>
                </Link>
              </div>

              <div className="pt-4">
                <div className="text-[13.5px] text-fg2">Sign out</div>
                <p className="mt-1 max-w-md text-[12px] leading-relaxed text-fg3">
                  Sign out of your account. You can sign back in anytime.
                </p>
                <div className="mt-3">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      useApiStore.getState().signOut();
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={200}>
          <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-fg3">
            hackmate · data stored in supabase
          </p>
        </Reveal>
      </div>
    </div>
  );
}



export default Calendar;
