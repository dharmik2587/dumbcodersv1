"use client";

import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Compass,
  Command,
  Inbox,
  Keyboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  Trophy,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/client/utils/cn";

import { useStore } from "@/client/store/useStore";
import { useApiStore, useMe } from "@/client/store/apiStore";
import { Toaster, IconButton } from "./ui";
import { daysLeft } from "@/client/data/seed";
import { ROLE_LABEL, RoleKey } from "@/client/types";
import { useTheme } from "@/client/lib/theme";

const NAV = [
  { to: "/discover", label: "Discover", icon: Compass, key: "g d" },
  { to: "/match", label: "Match", icon: Sparkles, key: "g m" },
  { to: "/requests", label: "Requests", icon: Inbox, key: "g r" },
  { to: "/teams", label: "Teams", icon: Users, key: "g t" },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, key: "g l" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, key: "g c" },
  { to: "/profile", label: "Profile", icon: UserRound, key: "g p" },
  { to: "/settings", label: "Settings", icon: Settings, key: "g s" },
];



function CountdownChip() {
  const bookmarks = useApiStore((s) => s.bookmarks);
  const hackathons = useApiStore((s) => s.hackathons);
  const [, force] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(i);
  }, []);
  const next = useMemo(() => {
    const list = hackathons
      .filter((h) => bookmarks.includes(h.id) && daysLeft(h) >= 0)
      .sort((a, b) => daysLeft(a) - daysLeft(b));
    return list[0];
  }, [bookmarks, hackathons]);

  if (!next) return null;
  const ms = new Date(next.registerDeadline).getTime() - Date.now();
  const d = Math.max(0, Math.floor(ms / 86_400_000));
  const h = Math.max(0, Math.floor((ms % 86_400_000) / 3_600_000));
  const m = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  const s = Math.max(0, Math.floor((ms % 60_000) / 1000));
  return (
    <Link
      href={`/hackathons/${next.id}`}
      className="group hidden items-center gap-2.5 border border-line bg-raised px-3 py-1.5 transition-colors hover:border-accent-line xl:flex"
    >
      <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-amber" />
      <span className="mono-label text-fg3">{next.name}</span>
      <span className="font-mono text-[11px] tnum text-fg">
        {d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
        {String(s).padStart(2, "0")}
      </span>
    </Link>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const notes = useStore((s) => s.notifications); // Keep seed data for now
  const read = useStore((s) => s.readNotification);
  const readAll = useStore((s) => s.readAllNotifications);
  const unread = notes.filter((n) => !n.read).length;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <IconButton label="Notifications" onClick={() => setOpen((v) => !v)} active={open}>
        <span className="relative">
          <Bell size={14} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-amber" />
          )}
        </span>
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-11 z-50 w-[320px] border border-line-strong bg-surface"
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <span className="mono-label text-fg">Activity</span>
              <button
                onClick={readAll}
                className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg3 transition-colors hover:text-accent"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {notes.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => {
                    read(n.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex gap-3 border-b border-line px-3.5 py-3 transition-colors last:border-0 hover:bg-hover",
                    !n.read && "bg-accent-soft/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      n.kind === "request" && "bg-accent",
                      n.kind === "deadline" && "bg-amber",
                      n.kind === "match" && "bg-mint",
                      n.kind === "team" && "bg-violet",
                      n.read && "opacity-30",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="text-[12.5px] text-fg">{n.title}</div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-fg2">{n.body}</div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-fg3">
                      {n.at}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Command palette                                                     */
/* ------------------------------------------------------------------ */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const hackathons = useApiStore((s) => s.hackathons);
  const apiBuilders = useApiStore((s) => s.builders);
  const seedBuilders = useStore((s) => s.builders);
  const builders = useMemo(() => {
    const map = new Map<string, any>();
    seedBuilders.forEach((b) => map.set(b.id, b));
    apiBuilders.forEach((b) => map.set(b.id, b));
    return Array.from(map.values());
  }, [apiBuilders, seedBuilders]);
  const teams = useApiStore((s) => s.teams);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const term = deferredQ.trim().toLowerCase();
    const routes = [
      { label: "Discover hackathons", group: "Navigate", href: "/discover" },
      { label: "Find teammates", group: "Navigate", href: "/match" },
      { label: "Collaboration requests", group: "Navigate", href: "/requests" },
      { label: "Teams", group: "Navigate", href: "/teams" },
      { label: "Calendar", group: "Navigate", href: "/calendar" },
      { label: "My profile", group: "Navigate", href: "/profile" },
      { label: "Settings", group: "Navigate", href: "/settings" },
      { label: "Landing page", group: "Navigate", href: "/" },
    ];
    const events = hackathons.slice(0, 40).map((h) => ({
      label: `${h.name} — ${h.host}`,
      group: "Hackathons",
      href: `/hackathons/${h.id}`,
      meta: h.code,
    }));
    const people = builders.map((b) => ({
      label: `${b.name} (${b.studentCode || b.handle || b.id.slice(0, 8)}) — ${ROLE_LABEL[b.role as RoleKey] ?? b.role}`,
      group: "Builders",
      href: `/b/${b.id}`,
      meta: `${b.studentCode ?? ""} ${b.id} ${b.handle ?? ""} ${b.college ?? ""}`.trim(),
    }));
    const teamItems = teams.map((t) => ({
      label: `${t.name} (Team ID: ${t.id.slice(0, 8)})`,
      group: "Teams",
      href: `/teams/${t.id}`,
      meta: `${t.id} ${t.hackathonId ?? ""}`.trim(),
    }));
    const all: { label: string; group: string; href: string; meta?: string }[] = [
      ...routes,
      ...events,
      ...people,
      ...teamItems,
    ];
    return term
      ? all.filter(
          (i) =>
            i.label.toLowerCase().includes(term) ||
            (i.meta ?? "").toLowerCase().includes(term) ||
            i.href.toLowerCase().includes(term),
        )
      : all.slice(0, 8);
  }, [deferredQ, hackathons, builders, teams]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 40);
    else setQ("");
  }, [open]);

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div className="absolute inset-0 bg-[#05070c]/70 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-xl border border-line-strong bg-surface"
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Command size={14} className="text-fg3" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIdx((i) => Math.min(i + 1, items.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter" && items[idx]) {
                    go(items[idx].href);
                  } else if (e.key === "Escape") {
                    onClose();
                  }
                }}
                placeholder="Search hackathons, builders, teams, pages…"
                className="flex-1 bg-transparent font-mono text-[12px] text-fg placeholder:text-fg3 focus:outline-none"
              />
              <kbd className="border border-line px-1.5 py-0.5 font-mono text-[9px] text-fg3">
                esc
              </kbd>
            </div>
            <div className="max-h-[380px] overflow-y-auto py-1.5">
              {items.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <span className="mono-label text-fg3">no matches</span>
                  <p className="mt-2 text-[12.5px] text-fg2">
                    Try a hackathon name, a builder, or a page.
                  </p>
                </div>
              )}
              {items.map((item, i) => (
                <button
                  key={item.href + item.label}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition-colors",
                    i === idx ? "bg-accent-soft" : "hover:bg-hover",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="mono-label w-20 shrink-0 text-fg3">{item.group}</span>
                    <span className="truncate text-[13px] text-fg">{item.label}</span>
                  </span>
                  {"meta" in item && item.meta && (
                    <span className="shrink-0 font-mono text-[9px] text-fg3">{item.meta}</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows = [
    ["/", "Focus search"],
    ["⌘K", "Command palette"],
    ["G then D", "Go to Discover"],
    ["G then M", "Go to Match"],
    ["G then T", "Go to Teams"],
    ["T", "Toggle light / dark"],
    ["?", "This sheet"],
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[76] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[#05070c]/70 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm border border-line-strong bg-surface p-5"
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            <div className="flex items-center justify-between">
              <span className="mono-label text-fg">Keyboard</span>
              <IconButton label="Close" onClick={onClose}>
                <X size={13} />
              </IconButton>
            </div>
            <div className="mt-4 divide-y divide-line">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2.5">
                  <span className="text-[12.5px] text-fg2">{v}</span>
                  <kbd className="border border-line px-2 py-1 font-mono text-[10px] text-fg">{k}</kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" ? localStorage.getItem("hackmate.rail") === "1" : false,
  );
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [teamSheet, setTeamSheet] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const teams = useApiStore((s) => s.teams);
  const activeTeamId = useApiStore((s) => s.activeTeamId);
  const setActiveTeam = useApiStore((s) => s.setActiveTeam);
  const requests = useStore((s) => s.requests); // Keep seed data for now
  const signOut = useApiStore((s) => s.signOut);
  const isAuthenticated = useApiStore((s) => s.isAuthenticated);
  const toggle = useTheme().toggle;
  const unread = requests.filter((r) => r.state === "new" && r.toId !== me.id).length;
  const team = teams.find((t) => t.id === activeTeamId) ?? teams[0];

  useEffect(() => {
    localStorage.setItem("hackmate.rail", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => setMobileNav(false), [pathname]);

  // global shortcuts
  useEffect(() => {
    let gPending = false;
    let gTimer = 0;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing =
        el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (e.key === "?") {
        setShortcuts((v) => !v);
        return;
      }
      if (e.key.toLowerCase() === "t") {
        toggle();
        return;
      }
      if (e.key.toLowerCase() === "g") {
        gPending = true;
        window.clearTimeout(gTimer);
        gTimer = window.setTimeout(() => (gPending = false), 900);
        return;
      }
      if (gPending) {
        const map: Record<string, string> = {
          d: "/discover",
          m: "/match",
          r: "/requests",
          t: "/teams",
          c: "/calendar",
          p: "/profile",
          s: "/settings",
        };
        const dest = map[e.key.toLowerCase()];
        if (dest) router.push(dest);
        gPending = false;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(gTimer);
    };
  }, [router, toggle]);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-70" aria-hidden />

      {/* ---------------- sidebar ---------------- */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-line bg-surface transition-[width] duration-300 md:flex",
          collapsed ? "w-[60px]" : "w-[236px]",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Wordmark />
            {!collapsed && (
              <span className="display truncate text-[15px] font-semibold text-fg">HackMate</span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-fg3 transition-all duration-200 hover:text-fg hover:[&>svg]:-translate-x-0.5"
          >
            <ChevronLeft size={14} className={cn("transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* team switcher */}
        <div className="border-b border-line p-3">
          <button
            onClick={() => setTeamSheet((v) => !v)}
            className="group flex w-full items-center gap-2.5 border border-line bg-raised p-2 text-left transition-colors hover:border-accent-line"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-accent-line bg-accent-soft font-mono text-[10px] text-accent">
              {team?.name.slice(0, 2).toUpperCase() ?? "—"}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-fg">{team?.name ?? "No team"}</span>
                <span className="mono-label block text-fg3">active team</span>
              </span>
            )}
          </button>
          <AnimatePresence>
            {teamSheet && !collapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-1.5 border border-line bg-raised">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTeam(t.id);
                        setTeamSheet(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-2.5 py-2 text-left transition-colors hover:bg-hover",
                        t.id === activeTeamId && "bg-accent-soft",
                      )}
                    >
                      <span className="truncate text-[12px] text-fg">{t.name}</span>
                      <span className="font-mono text-[9px] text-fg3">{t.members.length}p</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  href={n.to}
                  className={
                    cn(
                      "group relative flex items-center gap-3 px-2.5 py-2 transition-colors",
                      pathname.startsWith(n.to) ? "text-fg" : "text-fg2 hover:text-fg",
                      collapsed && "justify-center px-0",
                    )
                  }
                  title={collapsed ? n.label : undefined}
                >
                  {(() => {
                    const isActive = pathname.startsWith(n.to);
                    return (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-y-0 left-0 w-px bg-accent"
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        />
                      )}
                      <n.icon
                        size={15}
                        className={cn(
                          "shrink-0 transition-transform duration-200 group-hover:scale-110",
                          isActive && "text-accent",
                        )}
                      />
                      {!collapsed && (
                        <span className="flex-1 text-[13px] tracking-[-0.01em]">{n.label}</span>
                      )}
                      {!collapsed && n.to === "/requests" && unread > 0 && (
                        <span className="border border-amber-line bg-amber-soft px-1.5 py-0.5 font-mono text-[9px] tnum text-amber">
                          {unread}
                        </span>
                      )}
                      {collapsed && n.to === "/requests" && unread > 0 && (
                        <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-amber" />
                      )}
                    </>
                  );})()}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-2.5 border border-line bg-raised p-2 transition-colors hover:border-line-strong",
              collapsed && "justify-center",
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-canvas font-mono text-[10px] text-fg">
              {me.initials}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-fg">{me.name}</span>
                <span className="mono-label block truncate text-fg3">{ROLE_LABEL[me.role as RoleKey]}</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => {
              signOut();
              router.push("/sign-in");
            }}
            className={cn(
              "mt-1.5 flex w-full items-center gap-3 px-2.5 py-2 text-fg3 transition-colors hover:text-danger",
              collapsed && "justify-center px-0",
            )}
            title="Sign out"
          >
            <LogOut size={14} />
            {!collapsed && <span className="text-[12.5px]">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ---------------- mobile bottom bar ---------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-surface/95 py-2 backdrop-blur md:hidden">
        {NAV.slice(0, 5).map((n) => (
          <Link
            key={n.to}
            href={n.to}
            className={
              cn(
                "flex flex-col items-center gap-1 px-2 py-1 transition-colors",
                pathname.startsWith(n.to) ? "text-accent" : "text-fg3",
              )
            }
          >
            <n.icon size={17} />
            <span className="font-mono text-[8px] uppercase tracking-[0.1em]">{n.label}</span>
          </Link>
        ))}
      </nav>

      {/* ---------------- main column ---------------- */}
      <div className={cn("transition-[padding] duration-300", collapsed ? "md:pl-[60px]" : "md:pl-[236px]")}>
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4 md:px-6">
            <button
              className="text-fg2 md:hidden"
              aria-label="Open menu"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={18} />
            </button>

            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 sm:flex">
              <span className="mono-label text-fg3">hackmate</span>
              <span className="text-fg3">/</span>
              <span className="mono-label truncate text-fg">
                {pathname.slice(1).split("/")[0] || "overview"}
              </span>
            </nav>

            <button
              onClick={() => setPalette(true)}
              className="ml-auto flex items-center gap-2.5 border border-line bg-raised px-3 py-1.5 text-fg3 transition-colors hover:border-line-strong hover:text-fg2 sm:w-56 sm:justify-between"
            >
              <span className="flex items-center gap-2">
                <Search size={13} />
                <span className="hidden font-mono text-[11px] sm:inline">Search…</span>
              </span>
              <kbd className="hidden border border-line px-1.5 py-0.5 font-mono text-[9px] sm:inline">
                ⌘K
              </kbd>
            </button>

            <CountdownChip />
            <Notifications />

            <IconButton label="Keyboard shortcuts" onClick={() => setShortcuts(true)}>
              <Keyboard size={14} />
            </IconButton>
          </div>
        </header>

        <main className="relative px-4 pb-24 pt-6 md:px-6 md:pb-10">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* mobile sheet */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-[#05070c]/70" onClick={() => setMobileNav(false)} />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full w-[264px] border-r border-line bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <span className="display text-[15px] font-semibold">HackMate</span>
                <IconButton label="Close menu" onClick={() => setMobileNav(false)}>
                  <X size={14} />
                </IconButton>
              </div>
              <ul className="mt-6 space-y-1">
                {([...NAV, isAuthenticated ? { to: "#", label: "Sign out", icon: LogOut, key: "", action: () => { signOut(); router.push("/sign-in"); } } : { to: "/sign-in", label: "Sign in", icon: LogOut, key: "" }] as any[]).map((n) => (
                  <li key={n.label}>
                    {n.action ? (
                      <button onClick={n.action} className="flex w-full items-center gap-3 px-2 py-2.5 text-[13.5px] text-fg2 transition-colors hover:text-fg text-left">
                        <n.icon size={15} />
                        {n.label}
                      </button>
                    ) : (
                      <Link
                        href={n.to}
                        className="flex items-center gap-3 px-2 py-2.5 text-[13.5px] text-fg2 transition-colors hover:text-fg"
                      >
                        <n.icon size={15} />
                        {n.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <ShortcutSheet open={shortcuts} onClose={() => setShortcuts(false)} />
      <Toaster />
    </div>
  );
}



function Wordmark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" aria-hidden>
      <path
        d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"
        stroke="var(--fg)"
        strokeWidth="1.4"
        opacity="0.32"
      />
      <path d="M14 14h6v6h-6z" fill="var(--accent)" />
      <path d="M10 7h4M7 10v4M17 10v4M10 17h4" stroke="var(--mint)" strokeWidth="1.1" opacity="0.75" />
    </svg>
  );
}


