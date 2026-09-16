'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Matching", href: "#matching" },
  { label: "Hackathons", href: "#discovery" },
  { label: "Compatibility", href: "#compatibility" },
  { label: "Teams", href: "#composition" },
  { label: "Projects", href: "#builder" },
];

export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[60] h-px w-full bg-white/5">
      <div
        className="h-full bg-beam"
        style={{ width: `${p}%`, boxShadow: "0 0 12px rgba(79,140,255,.8)" }}
      />
    </div>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dark = true;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? dark
            ? "border-b border-white/8 bg-ink-950/80 backdrop-blur-xl"
            : "border-b border-dark-ink/8 bg-white/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5 md:px-10",
        )}
      >
        <Link href="#top" className="group flex items-center gap-3">
          <Logo dark={dark} />
          <span
            className={cn(
              "text-[15px] font-semibold tracking-[-0.02em] transition-colors",
              dark ? "text-white" : "text-dark-ink",
            )}
          >
            HackMate
          </span>
          <span
            className={cn(
              "hidden font-mono text-[9px] tracking-[0.2em] border px-1.5 py-0.5 sm:inline-block transition-colors",
              dark
                ? "border-white/15 text-slate-tech"
                : "border-dark-ink/15 text-slate-muted",
            )}
          >
            v0.9
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "group relative font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
                dark
                  ? "text-slate-tech hover:text-white"
                  : "text-slate-muted hover:text-dark-ink",
              )}
            >
              {l.label}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-beam transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.16em] px-3 py-2 transition-colors inline-block",
              dark ? "text-slate-tech hover:text-white" : "text-slate-muted hover:text-dark-ink",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="font-mono text-[10px] uppercase tracking-[0.16em] bg-beam px-3.5 py-2 text-white transition-all hover:bg-[#6b9dff] hover:shadow-[0_0_28px_-6px_rgba(79,140,255,.9)] inline-block"
          >
            Build profile
          </Link>
        </div>
      </div>
    </header>
  );
}

function Logo({ dark }: { dark: boolean }) {
  return (
    <span className="relative flex h-6 w-6 items-center justify-center">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"
          stroke={dark ? "#FFFFFF" : "#111827"}
          strokeWidth="1.4"
          opacity="0.35"
        />
        <path
          d="M14 14h6v6h-6z"
          fill="#4F8CFF"
          className="origin-center transition-transform duration-500"
        />
        <path d="M10 7h4M7 10v4M17 10v4M10 17h4" stroke="#43D6C2" strokeWidth="1.1" opacity="0.7" />
      </svg>
    </span>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink-950">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid grid-cols-2 gap-y-10 border-b border-white/10 py-14 md:grid-cols-12 md:gap-8">
          <div className="col-span-2 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <Logo dark />
              <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">HackMate</span>
            </div>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-slate-tech">
              A teammate layer for college hackathons. Built by people who spent too many
              nights scrolling group chats.
            </p>
          </div>
          {[
            {
              t: "Platform",
              items: [
                { name: "Matching", href: "#matching" },
                { name: "Hackathons", href: "/discover" },
                { name: "Teams", href: "/teams" },
                { name: "Projects", href: "/projects" },
              ],
            },
            {
              t: "Builders",
              items: [
                { name: "Profiles", href: "/discover" },
                { name: "Skill graph", href: "#matching" },
                { name: "Availability", href: "#composition" },
                { name: "Requests", href: "/requests" },
              ],
            },
            {
              t: "Company",
              items: [
                { name: "About", href: "/about" },
                { name: "Privacy", href: "/privacy" },
                { name: "Terms", href: "/terms" },
                { name: "Contact", href: "#cta" },
              ],
            },
          ].map((col) => (
            <div key={col.t} className="md:col-span-2 lg:col-span-2">
              <div className="mono-label text-slate-muted">{col.t}</div>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((i) => (
                  <li key={i.name}>
                    <Link
                      href={i.href}
                      className="text-[13px] text-slate-tech transition-colors hover:text-white"
                    >
                      {i.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 py-6 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-muted md:flex-row md:items-center md:justify-between">
          <span>© 2026 Hackmate Labs — Made on campus</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mint" />
              All systems operational
            </span>
            <span>BLR · 22.4°N</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
