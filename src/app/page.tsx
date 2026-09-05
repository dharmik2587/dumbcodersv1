"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Check, ExternalLink, Sparkles, Users } from "lucide-react";
import { BUILDERS, CLUSTER_NAME, CLUSTER_ORDER, HACKATHONS, daysLeft } from "@/client/data/seed";
import { byIdMap } from "@/client/store/useStore";
import { teamCoverage } from "@/client/lib/matching";
import {
  Button,
  Chip,
  CountUp,
  Label,
  Marquee,
  Meter,
  Panel,
  Reveal,
} from "@/components/ui";
import { AvailabilityStrip, LevelCell, inr } from "@/components/shared";
import { ROLE_LABEL } from "@/client/types";
import { cn } from "@/client/utils/cn";

const byId = byIdMap(BUILDERS);
const SAMPLE = {
  id: "demo",
  name: "Orbit-04",
  hackathonId: HACKATHONS[0].id,
  ownerId: "b-100",
  members: [
    { builderId: "b-100", role: "frontend" as const, joinedAt: "" },
    { builderId: "b-104", role: "product" as const, joinedAt: "" },
  ],
  openSlots: [{ role: "ml" as const, note: "runtime inference" }],
  visibility: "discoverable" as const,
};
const COV = teamCoverage(SAMPLE, byId, HACKATHONS[0]);

const CANDIDATES = ["b-102", "b-101", "b-103"].map((id) => byId.get(id)!).filter(Boolean);

const SIGNALS = [
  ["S-01", "Skill complement", 34, "Share of the team's gap clusters a builder raises to shipping level, minus a duplication penalty."],
  ["S-02", "Commitment window", 22, "Overlap of weekly free hours, scaled by whether it lands inside the event's build window."],
  ["S-03", "Build history", 18, "Shipped projects, repositories and prior submissions, normalised across the corpus."],
  ["S-04", "Stack overlap", 14, "Shared languages and frameworks, so the first commit doesn't start with a tooling argument."],
  ["S-05", "Intent match", 12, "Same event, same track interest, and a stated goal that lines up."],
] as const;

const FAILURES = [
  ["T-14d", "The chat goes quiet", "A 240-member group chat, forty 'interested' replies, and nobody has said what they can build."],
  ["T-06h", "Three frontend, no backend", "Teams form around whoever replies fastest, not around what the problem statement demands."],
  ["T+20h", "The designer arrives late", "By then the data model is fixed and the interface has to be argued backwards."],
  ["T+34h", "Submission is a solo sprint", "One person writes the README, the deck and the demo script while everyone else sleeps."],
];

const MODULES = [
  ["M-01", "Discover", "Hackathons filtered by track, travel, team-size cap and how close the deadline is."],
  ["M-02", "Profile", "A technical profile built from repos, shipped projects and stack — not a résumé."],
  ["M-03", "Match", "Compatibility scored on skill complement, free hours and intent for the same event."],
  ["M-04", "Compose", "See which roles your team is missing before the first commit, not on hour thirty."],
  ["M-05", "Request", "Structured requests with role, availability and a reason — no cold intros."],
  ["M-06", "Track", "Deadlines, submission checklists and project history across every event you enter."],
];

const LOG = [
  ["Fri 21:00", "Team locked · 4 members", "done"],
  ["Sat 02:40", "Scope cut to one user flow", "done"],
  ["Sat 15:10", "Model endpoint live on /v1/triage", "done"],
  ["Sun 09:30", "Design pass · 11 screens", "active"],
  ["Sun 18:00", "Submission · Symbiosis", "todo"],
] as const;

import { useApiStore } from "@/client/store/apiStore";
import type { Hackathon as ApiHackathon } from "@/client/types";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";

export default function Landing() {
  const { user } = useAuth();
  const router = useRouter();
  const hackathons = useApiStore((s) => s.hackathons);
  const loadHackathons = useApiStore((s) => s.loadHackathons);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      router.replace('/discover');
    }
  }, [user, router]);

  useEffect(() => {
    if (hackathons.length === 0) {
      loadHackathons().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadHackathons, hackathons.length]);

  return (
    <div className="bg-canvas">
      <LandingNav user={user} />
      <Hero user={user} />
      <PlatformStrip hackathons={hackathons} />
      <Problem />
      <Matching />
      <Discovery hackathons={hackathons.slice(0, 6)} loading={loading} />
      <Compatibility />
      <Composition />
      <Builder />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function LandingNav({ user }: { user: any }) {
  const links = [
    ["Matching", "#matching"],
    ["Hackathons", "#discovery"],
    ["Compatibility", "#compatibility"],
    ["Teams", "#composition"],
    ["Projects", "#builder"],
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5 md:px-10">
        <button onClick={() => scrollToId("top")} className="flex items-center gap-2.5" aria-label="Back to top">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" stroke="var(--fg)" strokeWidth="1.4" opacity="0.32" />
            <path d="M14 14h6v6h-6z" fill="var(--accent)" />
            <path d="M10 7h4M7 10v4M17 10v4M10 17h4" stroke="var(--mint)" strokeWidth="1.1" opacity="0.75" />
          </svg>
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-fg">HackMate</span>
        </button>
        <nav className="hidden items-center gap-7 lg:flex">
          {links.map(([l, h]) => (
            <button
              key={h}
              onClick={() => scrollToId(h.slice(1))}
              className="group relative font-mono text-[10px] uppercase tracking-[0.16em] text-fg3 transition-colors hover:text-fg"
            >
              {l}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/discover">
              <Button size="sm">Go to Discover</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-fg3 transition-colors hover:text-fg sm:block">
                Sign in
              </Link>
              <Link href="/sign-in">
                <Button size="sm">Build profile</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
function Hero({ user }: { user: any }) {
  return (
    <section id="top" className="relative overflow-hidden pt-16 md:pt-24">
      <div className="tech-cols pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full blur-[130px]"
        style={{ background: `radial-gradient(circle, var(--accent), transparent 65%)`, opacity: "var(--glow-a)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-[380px] w-[380px] rounded-full blur-[130px]"
        style={{ background: `radial-gradient(circle, var(--mint), transparent 65%)`, opacity: "var(--glow-b)" }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal className="flex items-center justify-between border-b border-line pb-3">
          <Label tone="accent">01 / teammate layer for college hackathons</Label>
          <Label className="hidden md:inline-flex">cycle 2026 · spring</Label>
        </Reveal>

        <div className="grid gap-x-10 gap-y-14 pt-12 lg:grid-cols-12 lg:pt-16">
          <div className="lg:col-span-6">
            <Reveal delay={60}>
              <h1 className="display text-[clamp(2.6rem,7vw,5.4rem)] font-medium leading-[0.92] text-fg">
                Find the missing
                <br />
                piece in your{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">build.</span>
                  <span className="absolute bottom-0.5 left-0 -z-0 h-[0.3em] w-full bg-accent/20" aria-hidden />
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-8 max-w-xl text-[16px] leading-[1.7] text-fg2">
                HackMate reads what your team can actually ship — the roles you hold, the hours
                you&apos;re free, the stack you argue about least — then introduces the few people who
                close the gap. No cold DMs into random group chats.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                {user ? (
                  <Link href="/discover">
                    <Button size="lg" className="group">
                      Go to Dashboard
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/sign-in">
                    <Button size="lg" className="group">
                      Start your build profile
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                )}
                <Link href="/discover">
                  <Button size="lg" variant="outline">Browse hackathons</Button>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg3">
                <span>college email verified</span>
                <span className="hidden h-3 w-px bg-line sm:block" />
                <span>free for students</span>
                <span className="hidden h-3 w-px bg-line sm:block" />
                <span>no recruiter access</span>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-6">
            <Reveal delay={200}>
              <div className="relative border border-line bg-surface">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-sweep bg-gradient-to-b from-transparent via-[color:color-mix(in_srgb,var(--accent)_8%,transparent)] to-transparent"
                />
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mint" />
                    <span className="mono-label text-fg">match console</span>
                  </span>
                  <span className="mono-label text-fg3">team · orbit-04</span>
                </div>

                <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
                  {[
                    ["event", "Symbiosis", "HK-2000"],
                    ["members", "2 / 4", "2 slots open"],
                    ["gap", "AI / ML", "critical"],
                  ].map(([k, v, s]) => (
                    <div key={k} className="px-4 py-3.5">
                      <div className="mono-label text-fg3">{k}</div>
                      <div className="mt-1.5 text-[15px] tracking-[-0.02em] text-fg">{v}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-fg3">{s}</div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label tone="muted">ranked complements</Label>
                    <Label tone="mint">{CANDIDATES.length} candidates</Label>
                  </div>
                  <div className="mt-3 space-y-px">
                    {CANDIDATES.map((c, i) => (
                      <div
                        key={c.id}
                        className="border border-line bg-raised/60 px-3.5 py-3 transition-colors hover:border-line-strong hover:bg-raised"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-fg3">{c.id}</span>
                              <span className="truncate text-[14px] text-fg">{c.name}</span>
                              {i === 0 && <Chip tone="mint">best fit</Chip>}
                            </div>
                            <div className="mt-1 truncate font-mono text-[10px] text-fg3">
                              {c.college} · {ROLE_LABEL[c.role]} · {c.weeklyHours}h/wk
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-mono text-[18px] tnum text-fg">
                              <CountUp to={[94, 87, 81][i]} />
                            </div>
                            <div className="mono-label mt-0.5 text-mint">complement</div>
                          </div>
                        </div>
                        <div className="mt-2.5">
                          <Meter value={[94, 87, 81][i]} tone={i === 0 ? "mint" : "accent"} delay={i * 120} />
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {c.skills.filter((s) => s.level >= 2).slice(0, 3).map((s) => (
                            <Chip key={s.id}>{s.label}</Chip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-line px-4 py-3.5">
                  <Label tone="muted">roster coverage · {COV.overall}%</Label>
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {[
                      ["Frontend", true],
                      ["Product", true],
                      ["Services", true],
                      ["AI / ML", false],
                    ].map(([r, filled]) => (
                      <div
                        key={r as string}
                        className={cn(
                          "px-1.5 py-2 text-center",
                          filled ? "border border-line bg-raised" : "border border-dashed border-amber-line bg-amber-soft",
                        )}
                      >
                        <div className={cn("font-mono text-[9px] uppercase tracking-[0.1em]", filled ? "text-fg3" : "text-amber")}>
                          {r}
                        </div>
                        <div className={cn("mt-1 font-mono text-[10px]", filled ? "text-mint" : "text-amber/70")}>
                          {filled ? "filled" : "open"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal delay={400} className="mt-16 hidden items-center justify-between border-t border-line py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-fg3 md:flex">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mint" />
            match engine active
          </span>
          <span>Σ wᵢ·sᵢ · five weighted signals</span>
          <span>scroll</span>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function PlatformStrip({ hackathons }: { hackathons: any[] }) {
  const now = new Date();
  const rail = (hackathons.length > 0 ? hackathons.slice(0, 8) : HACKATHONS.slice(0, 8)).map(
    (h) => {
      const days = Math.max(0, Math.round((new Date(h.registerDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return `${h.code} · ${h.name.toUpperCase()} · ${h.city.toUpperCase()} · T-${days}D`;
    }
  );
  return (
    <section id="platform" className="bg-surface">
      <div className="border-y border-line">
        <Marquee>
          {rail.map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-4 whitespace-nowrap border-r border-line px-6 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg3">
              <span className={cn("h-1.5 w-1.5 rounded-full", item.includes("T-0D") ? "bg-amber" : "bg-mint")} />
              {item}
            </span>
          ))}
        </Marquee>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-10 md:py-24">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Reveal>
              <Label tone="accent">02 / the platform</Label>
              <h2 className="display mt-5 text-[clamp(1.9rem,3.4vw,2.8rem)] font-medium leading-[1.03] text-fg">
                Six things that replace the group chat.
              </h2>
              <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-fg2">
                Every module writes back into the same graph. Bookmark an event and it feeds
                matching; accept a request and your team&apos;s coverage updates in place.
              </p>
              <Link href="/discover">
                <Button variant="outline" size="sm" className="mt-7">
                  Open the index <ArrowRight size={12} />
                </Button>
              </Link>
            </Reveal>
          </div>

          <div className="md:col-span-8">
            <div className="grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map(([id, name, copy], i) => (
                <Reveal
                  key={id}
                  delay={i * 60}
                  className="group relative border-b border-r border-line p-6 transition-colors duration-500 hover:bg-hover"
                >
                  <span className="font-mono text-[10px] tracking-[0.18em] text-fg3">{id}</span>
                  <h3 className="mt-6 text-[17px] tracking-[-0.02em] text-fg">{name}</h3>
                  <p className="mt-2 text-[13px] leading-[1.6] text-fg2">{copy}</p>
                  <span className="absolute bottom-0 left-0 h-px w-0 bg-accent transition-all duration-500 group-hover:w-full" />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Problem() {
  return (
    <section id="problem" className="border-t border-line py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-24">
              <Reveal>
                <Label tone="accent">03 / the problem</Label>
                <p className="mt-5 max-w-[240px] font-mono text-[11px] leading-[1.8] text-fg3">
                  Field notes from 60+ campus hackathons, 2024–2026. Teams rarely fail on ideas.
                  They fail on composition.
                </p>
                <div className="mt-8 space-y-2 border-t border-line pt-4">
                  {[["Sample", "n = 412 teams"], ["Window", "Jan 2024 — Feb 2026"], ["Method", "Post-submission interviews"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">{k}</span>
                      <span className="font-mono text-[10px] text-fg">{v}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>

          <div className="lg:col-span-8 lg:col-start-5">
            <Reveal>
              <h2 className="display text-[clamp(2rem,4.6vw,3.8rem)] font-medium leading-[1.0] text-fg">
                Most hackathon teams are assembled by accident.
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <div className="mt-10 grid gap-8 md:grid-cols-2">
                <p className="text-[15px] leading-[1.75] text-fg2">
                  <span className="display float-left mr-2 mt-1 text-[42px] font-medium leading-[0.8] text-fg">Y</span>
                  ou find a problem statement you care about. You post it in a group chat. Four
                  people say yes within a minute — three of them write React. Nobody has asked
                  who owns the model, who owns the deck, or who is actually free on Saturday
                  afternoon.
                </p>
                <p className="text-[15px] leading-[1.75] text-fg2">
                  The result is a team that looks complete on the registration form and behaves
                  like two people and an audience for thirty-six hours. The gap isn&apos;t talent. It&apos;s
                  that nobody could see the shape of the team until it was too late to change it.
                </p>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <figure className="my-14 border-y border-line py-10">
                <blockquote className="display text-[clamp(1.5rem,3vw,2.3rem)] font-medium leading-[1.15] text-fg">
                  “We didn&apos;t lose because the idea was weak. We lost because nobody on the team
                  could build the thing we pitched.”
                  <span className="ml-2 inline-block h-px w-16 translate-y-[-0.35em] bg-mint" />
                </blockquote>
                <figcaption className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-fg3">
                  finalist debrief — regional round, Pune
                </figcaption>
              </figure>
            </Reveal>

            <Reveal>
              <div className="flex items-baseline justify-between border-b border-line pb-3">
                <Label tone="accent">failure ledger</Label>
                <span className="font-mono text-[10px] tracking-[0.14em] text-fg3">observed pattern</span>
              </div>
            </Reveal>
            <div className="divide-y divide-line">
              {FAILURES.map(([t, title, body], i) => (
                <Reveal key={t} delay={i * 70} className="grid grid-cols-12 gap-x-6 gap-y-2 py-6">
                  <div className="col-span-3 md:col-span-2">
                    <span className="font-mono text-[11px] tnum text-amber">{t}</span>
                  </div>
                  <div className="col-span-9 md:col-span-4">
                    <h3 className="text-[16px] tracking-[-0.02em] text-fg">{title}</h3>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <p className="text-[13.5px] leading-[1.65] text-fg2">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={110}>
              <div className="mt-12 flex items-start gap-4 border-l-2 border-accent bg-surface px-6 py-5">
                <Label tone="accent" className="mt-0.5">constraint</Label>
                <p className="text-[14px] leading-[1.7] text-fg2">
                  Team composition is decided in the first six hours. Any tool that helps has to
                  work <em className="not-italic text-fg">before</em> the hackathon starts — not
                  inside it.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Matching() {
  const [active, setActive] = useState(0);
  const c = CANDIDATES[active];
  const raws = [
    [0.96, 0.98, 0.91, 0.88, 0.95],
    [0.82, 0.94, 0.86, 0.98, 0.78],
    [0.93, 0.75, 0.79, 0.55, 0.9],
  ][active];
  const total = Math.round(SIGNALS.reduce((a, [, , w], i) => a + (w / 100) * raws[i], 0) * 100);

  return (
    <section id="matching" data-zone="inverse" className="relative overflow-hidden bg-surface py-24 md:py-32">
      <div className="tech-cols pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Label tone="accent">04 / matching model</Label>
              <h2 className="display mt-6 text-[clamp(2rem,4.2vw,3.4rem)] font-medium leading-[1.03] text-fg">
                Compatibility is a calculation, not a first impression.
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-fg2">
                Five signals, weighted, scored against the specific event you&apos;re entering. The
                output is a number both people can interrogate — every point traceable to a signal
                you can disagree with.
              </p>
            </Reveal>
            <Reveal delay={140}>
              <div className="mt-9 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4 lg:grid-cols-2">
                {[
                  ["01", "Parse", "Repos, projects and declared roles become a skill vector."],
                  ["02", "Detect", "The team vector is compared to the track's demands."],
                  ["03", "Rank", "Builders ranked by how much of the gap they close."],
                  ["04", "Open", "A request carries role, hours and reason."],
                ].map(([n, t, d]) => (
                  <div key={n} className="bg-surface p-4">
                    <span className="font-mono text-[10px] tracking-[0.18em] text-accent">{n}</span>
                    <div className="mt-2 text-[14px] text-fg">{t}</div>
                    <p className="mt-1.5 text-[12px] leading-[1.55] text-fg2">{d}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={100}>
              <div className="border border-line bg-[color:color-mix(in_srgb,var(--bg-0)_45%,transparent)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                  <span className="mono-label text-fg">score decomposition</span>
                  <div className="flex gap-1">
                    {CANDIDATES.map((cc, i) => (
                      <button
                        key={cc.id}
                        onClick={() => setActive(i)}
                        className={cn(
                          "border px-2.5 py-1.5 font-mono text-[10px] transition-colors",
                          i === active ? "border-mint/50 bg-mint/10 text-mint" : "border-line text-fg2 hover:text-fg",
                        )}
                      >
                        {cc.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-line">
                  {SIGNALS.map(([id, label, w, detail], i) => (
                    <div key={id} className="grid grid-cols-12 items-center gap-4 px-5 py-4">
                      <div className="col-span-12 md:col-span-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-fg2">{id}</span>
                          <span className="text-[13.5px] text-fg">{label}</span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-[1.5] text-fg2 md:hidden">{detail}</p>
                      </div>
                      <div className="col-span-4 text-right md:col-span-2">
                        <span className="font-mono text-[12px] tnum text-fg2">{w}</span>
                        <span className="font-mono text-[10px] text-fg2">w</span>
                      </div>
                      <div className="col-span-4 text-right md:col-span-2">
                        <span className="font-mono text-[12px] tnum text-mint">{raws[i].toFixed(2)}</span>
                      </div>
                      <div className="col-span-4 flex items-center gap-3 md:col-span-4">
                        <Meter key={`${active}-${id}`} value={((w / 100) * raws[i] * 100) / 0.34} tone={i === 0 ? "mint" : "accent"} delay={i * 80} />
                        <span className="w-9 shrink-0 text-right font-mono text-[11px] tnum text-fg2">
                          {(w * raws[i]).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-line px-5 py-5">
                  <div>
                    <div className="mono-label text-fg2">complement · {c?.name}</div>
                    <div className="mt-1 font-mono text-[11px] text-fg2">Σ wᵢ · sᵢ , renorm. 0—100</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[34px] leading-none tnum text-fg">
                      <CountUp key={total} to={total} duration={800} />
                    </div>
                    <div className="mono-label mt-1.5 text-mint">/ 100</div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-4 border border-line">
                {SIGNALS.slice(0, 2).map(([id, label, , detail], i) => (
                  <div key={id} className={cn("flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6", i === 0 && "border-b border-line")}>
                    <span className="mono-label w-40 shrink-0 pt-1 text-fg2">{id} · {label}</span>
                    <p className="text-[13px] leading-[1.65] text-fg2">{detail}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Discovery({ hackathons, loading }: { hackathons: ApiHackathon[]; loading: boolean }) {
  return (
    <section id="discovery" className="relative overflow-hidden border-t border-line bg-surface py-24 md:py-32">
      <div className="dotfield pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Reveal>
              <Label tone="accent">05 / discovery</Label>
              <h2 className="display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] font-medium leading-[1.03] text-fg">
                Every hackathon worth travelling for, in one index.
              </h2>
              <p className="mt-6 max-w-sm text-[15px] leading-[1.7] text-fg2">
                Filter by track, travel, team-size cap and deadline. Bookmark an event and
                HackMate starts ranking teammates for it the same day — before registrations close
                and the group chats go quiet.
              </p>
              <Link href="/discover">
                <Button className="mt-7">Open the index <ArrowRight size={13} /></Button>
              </Link>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <Reveal delay={100}>
              <Panel>
                <div className="hidden grid-cols-12 gap-4 border-b border-line px-5 py-2.5 md:grid">
                  <Label className="col-span-4">event</Label>
                  <Label className="col-span-3">format</Label>
                  <Label className="col-span-2">closes</Label>
                  <Label className="col-span-2">prize</Label>
                  <Label className="col-span-1 text-right">save</Label>
                </div>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-2 items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4 md:grid-cols-12">
                      <div className="col-span-2 md:col-span-4 space-y-1.5">
                        <div className="h-4 w-24 bg-fg3/20 rounded" />
                        <div className="h-5 w-32 bg-fg3/20 rounded" />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <div className="h-4 w-20 bg-fg3/20 rounded" />
                      </div>
                      <div className="col-span-2">
                        <div className="h-4 w-12 bg-fg3/20 rounded" />
                      </div>
                    </div>
                  ))
                ) : hackathons.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="font-mono text-[12px] text-fg3">No hackathons found</p>
                  </div>
                ) : (
                  hackathons.map((h) => {
                    const deadline = h.registerDeadline ? new Date(h.registerDeadline) : null;
                    const now = new Date();
                    const daysLeftCount = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : -1;
                    const urgent = daysLeftCount >= 0 && daysLeftCount <= 7;
                    const status = h.status || (daysLeftCount < 0 ? "closed" : daysLeftCount <= 7 ? "closing" : "open");

                    return (
                      <Link
                        key={h.id}
                        href={`/hackathons/${h.id}`}
                        className="grid grid-cols-2 items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4 transition-colors last:border-0 hover:bg-hover md:grid-cols-12"
                      >
                        <div className="col-span-2 md:col-span-4">
                          <div className="flex items-center gap-2">
                            <Chip tone={status === "closed" ? "neutral" : status === "closing" ? "amber" : "mint"}>
                              {status}
                            </Chip>
                          </div>
                          <div className="mt-1.5 text-[16px] tracking-[-0.02em] text-fg">{h.name}</div>
                          <div className="mt-0.5 font-mono text-[10px] text-fg3">{h.host || "Hackathon"}</div>
                        </div>
                        <div className="md:col-span-3">
                          <div className="font-mono text-[11px] text-fg2 capitalize">{h.mode || "online"}</div>
                          <div className="mt-1 font-mono text-[10px] text-fg3">{h.city || "Global"}</div>
                        </div>
                        <div className="md:col-span-2">
                          <div className={cn("font-mono text-[13px] tnum", urgent ? "text-amber" : "text-fg")}>
                            {daysLeftCount < 0 ? "—" : `T-${daysLeftCount}d`}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="font-mono text-[12px] tnum text-fg">{inr(h.prize)}</div>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
                          {h.registrationUrl && (
                            <a
                              href={`/api/hackathons/${h.id}/register`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex h-7 w-7 items-center justify-center border border-accent/40 bg-accent/10 text-accent transition-all hover:bg-accent hover:text-accent-ink hover:scale-105"
                              title="Register on Unstop"
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                          <Bookmark size={13} className="text-fg3" />
                        </div>
                      </Link>
                    );
                  })
                )}
              </Panel>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Compatibility() {
  return (
    <section id="compatibility" className="relative overflow-hidden bg-surface py-24 md:py-32">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Reveal>
              <Label tone="mint">06 / compatibility</Label>
              <h2 className="display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] font-medium leading-[1.03] text-fg">
                See the hole before you fall in.
              </h2>
              <p className="mt-6 max-w-sm text-[15px] leading-[1.7] text-fg2">
                Coverage is recomputed every time a request is accepted or a skill is added. What
                the team cannot do is stated plainly, with the roles that would fix it attached.
              </p>
              <div className="mt-9 space-y-3 border-t border-line pt-5">
                {[
                  ["bg-accent", "3 — owns it"],
                  ["bg-accent/55", "2 — ships with review"],
                  ["bg-accent/20", "1 — can contribute"],
                  ["border border-dashed border-amber-line", "0 — team gap"],
                ].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-3">
                    <span className={cn("h-2.5 w-6 border border-line", c)} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg2">{l}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 border border-amber-line bg-amber-soft px-5 py-4">
                <div className="mono-label text-amber">{COV.hardGaps.length} hard gap{COV.hardGaps.length === 1 ? "" : "s"} detected</div>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-amber">
                  {COV.hardGaps.map((g) => CLUSTER_NAME[g]).join(" · ") || "none"}
                </p>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <Reveal delay={100}>
              <div className="border border-line bg-[color:color-mix(in_srgb,var(--bg-0)_45%,transparent)]">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <span className="mono-label text-fg">coverage matrix</span>
                  <span className="mono-label text-fg2">orbit-04 · symbiosis</span>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[540px]">
                    <div className="grid grid-cols-12 gap-2 border-b border-line px-5 py-3">
                      <span className="mono-label col-span-6 text-fg2">skill cluster</span>
                      {SAMPLE.members.map((m) => (
                        <div key={m.builderId} className="col-span-2 flex flex-col items-center">
                          <span className="font-mono text-[10px] text-fg">
                            {byId.get(m.builderId)?.name.split(" ")[0]}
                          </span>
                          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg2">
                            {ROLE_LABEL[m.role]}
                          </span>
                        </div>
                      ))}
                      <div className="col-span-2 flex flex-col items-center">
                        <span className="font-mono text-[10px] text-amber">Gap</span>
                        <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg2">unfilled</span>
                      </div>
                    </div>

                    <div className="divide-y divide-line">
                      {CLUSTER_ORDER.map((cl, i) => {
                        const isGap = COV.hardGaps.includes(cl);
                        return (
                          <div key={cl} className="grid grid-cols-12 items-center gap-2 px-5 py-[9px]">
                            <div className="col-span-6 flex items-center gap-2.5">
                              <span className="font-mono text-[9px] tnum text-fg2">{String(i + 1).padStart(2, "0")}</span>
                              <span className={cn("text-[12.5px]", isGap ? "text-amber" : "text-fg2")}>
                                {CLUSTER_NAME[cl]}
                              </span>
                            </div>
                            {SAMPLE.members.map((m, j) => {
                              const b = byId.get(m.builderId);
                              const lv = b ? Math.min(3, b.skills.filter((s) => s.cluster === cl).reduce((a, s) => a + s.level, 0)) : 0;
                              return (
                                <div key={m.builderId} className="col-span-2 flex justify-center">
                                  <LevelCell level={lv} delay={i * 35 + j * 60} />
                                </div>
                              );
                            })}
                            <div className="col-span-2 flex justify-center">
                              <LevelCell level={0} gap={isGap} delay={i * 35 + 240} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg2">
                        roster coverage {COV.overall}% · target 85%
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber">
                        gap column drives ranking
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Composition() {
  return (
    <section id="composition" className="border-t border-line py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Label tone="accent">07 / composition</Label>
              <h2 className="display mt-6 text-[clamp(2rem,4.2vw,3.3rem)] font-medium leading-[1.03] text-fg">
                Assemble the team like a system diagram.
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-fg2">
                Each accepted request writes into the roster: a role, a stack, and the hours that
                person is genuinely free. Coverage updates in place, so the team can see what
                changed and why.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-9 border border-line bg-surface p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <Label tone="muted">roster coverage</Label>
                    <div className="mt-2 font-mono text-[44px] leading-none tnum text-fg">
                      <CountUp to={COV.overall} />
                      <span className="text-[18px] text-fg3">%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Label tone="muted">target</Label>
                    <div className="mt-2 font-mono text-[18px] tnum text-fg3">85%</div>
                  </div>
                </div>
                <div className="mt-5">
                  <Meter value={COV.overall} tone={COV.overall >= 85 ? "mint" : "amber"} height={4} />
                </div>
                <Link href="/requests">
                  <Button variant="outline" size="sm" className="mt-5 w-full">
                    <Users size={12} /> Review requests
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={100}>
              <Panel>
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <Label tone="accent">weekly availability</Label>
                  <span className="mono-label text-mint">accepted members</span>
                </div>
                <div className="divide-y divide-line">
                  {[...SAMPLE.members.map((m) => m.builderId), "b-103"].map((id) => {
                    const b = byId.get(id);
                    if (!b) return null;
                    return (
                      <div key={id} className="grid grid-cols-12 items-center gap-4 px-5 py-4">
                        <div className="col-span-5 md:col-span-4">
                          <div className="text-[14.5px] text-fg">{b.name}</div>
                          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg3">
                            {ROLE_LABEL[b.role]}
                          </div>
                        </div>
                        <div className="col-span-7 flex gap-1.5 md:col-span-4">
                          {b.skills.filter((s) => s.level >= 2).slice(0, 2).map((s) => (
                            <Chip key={s.id}>{s.label}</Chip>
                          ))}
                        </div>
                        <div className="col-span-12 md:col-span-4">
                          <AvailabilityStrip b={b} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <span className="flex h-7 w-7 items-center justify-center border border-dashed border-amber-line bg-amber-soft font-mono text-[11px] text-amber">+</span>
                    <div>
                      <div className="text-[13px] text-amber">AI / ML · open</div>
                      <div className="mt-0.5 text-[11.5px] text-fg3">Runtime inference for the triage model</div>
                    </div>
                  </div>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3">
                {[
                  ["REQ-2291", "Ananya R.", "AI / ML", "+12% coverage"],
                  ["REQ-2288", "Dev M.", "Backend", "+7% coverage"],
                  ["REQ-2284", "Sara K.", "Design", "+9% coverage"],
                ].map(([id, name, role, delta]) => (
                  <div key={id} className="bg-surface p-4">
                    <span className="font-mono text-[10px] tracking-[0.16em] text-fg3">{id}</span>
                    <div className="mt-3 text-[13.5px] text-fg">{name}</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg3">{role}</div>
                    <div className="mt-3 flex items-center justify-between">
                      <Chip tone="mint">{delta}</Chip>
                      <Check size={12} className="text-mint" />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Builder() {
  return (
    <section id="builder" className="relative overflow-hidden bg-surface py-24 md:py-32">
      <div className="tech-cols pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid gap-x-10 gap-y-16 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Reveal>
              <Label tone="amber">08 / why it matters</Label>
              <h2 className="display mt-7 text-[clamp(2.1rem,4.8vw,4rem)] font-medium leading-[0.99] text-fg">
                Nobody remembers the prize money.
                <br />
                <span className="text-fg2">They remember the Sunday night build.</span>
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <div className="mt-10 max-w-lg space-y-5 text-[15px] leading-[1.75] text-fg2">
                <p>
                  The thing students describe months later isn&apos;t the result. It&apos;s that one weekend
                  where the work compounded — where the model landed at 3 a.m. and the interface
                  was already waiting for it.
                </p>
                <p>
                  That only happens with the right four people. Not the most decorated, the right
                  ones: the person who holds the backend steady, the person who cuts scope without
                  killing the idea, the person who makes it legible to a judge in ninety seconds.
                </p>
                <p className="border-l border-line pl-4 text-fg">
                  HackMate exists to make that combination findable in an afternoon instead of a
                  lucky semester.
                </p>
              </div>
            </Reveal>
            <Reveal delay={210}>
              <div className="mt-10 grid grid-cols-3 gap-px border border-line bg-line">
                {[
                  ["before", "Group chat", "whoever replies first"],
                  ["with hackmate", "Coverage map", "who closes the gap"],
                  ["after", "Project record", "portfolio, not a screenshot"],
                ].map(([k, v, s]) => (
                  <div key={k} className="bg-surface p-4">
                    <div className="mono-label text-fg2">{k}</div>
                    <div className="mt-2 text-[14px] text-fg">{v}</div>
                    <div className="mt-1 font-mono text-[10px] text-fg2">{s}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-6">
            <Reveal delay={100}>
              <div className="border border-line bg-[color:color-mix(in_srgb,var(--bg-0)_45%,transparent)]">
                <div className="flex items-start justify-between border-b border-line px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[19px] tracking-[-0.025em] text-fg">Triage</span>
                      <Chip tone="accent">in build</Chip>
                    </div>
                    <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg2">
                      symbiosis · track: ai/health · submission T-08:20
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {["AR", "DM", "SK", "RS"].map((a) => (
                      <span key={a} className="flex h-7 w-7 items-center justify-center border border-line bg-surface font-mono text-[9px] text-fg2">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
                  {[["commits", "112"], ["open tasks", "6"], ["owner gaps", "0"]].map(([k, v]) => (
                    <div key={k} className="px-5 py-4">
                      <div className="mono-label text-fg2">{k}</div>
                      <div className="mt-1.5 font-mono text-[20px] tnum text-fg">{v}</div>
                    </div>
                  ))}
                </div>

                <div className="px-5 py-5">
                  <span className="mono-label text-fg2">build log</span>
                  <div className="relative mt-5">
                    <span className="absolute bottom-1 left-[5px] top-1 w-px bg-line" />
                    {LOG.map(([t, label, state]) => (
                      <div key={t} className="relative flex gap-4 pb-5 last:pb-0">
                        <span
                          className={cn(
                            "relative z-10 mt-1 h-[11px] w-[11px] shrink-0 rounded-full border",
                            state === "done" && "border-mint/60 bg-mint",
                            state === "active" && "border-accent bg-accent/30",
                            state === "todo" && "border-line bg-surface",
                          )}
                        >
                          {state === "active" && <span className="absolute inset-0 animate-pulse-dot rounded-full bg-accent/60" />}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-baseline gap-x-3">
                            <span className="font-mono text-[10px] tnum text-fg2">{t}</span>
                            <span className={cn("text-[13.5px]", state === "todo" ? "text-fg2" : "text-fg")}>{label}</span>
                          </div>
                          {state === "active" && (
                            <div className="mt-2 max-w-[220px]">
                              <Meter value={68} tone="accent" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-line px-5 py-5">
                  <span className="mono-label text-fg2">submission checklist · 3 of 5</span>
                  <div className="mt-4 space-y-2.5">
                    {[
                      ["Repo public + README", true],
                      ["Demo video under 3 minutes", true],
                      ["Model card + eval table", true],
                      ["Deck exported to PDF", false],
                      ["All member profiles linked", false],
                    ].map(([label, done]) => (
                      <div key={label as string} className="flex items-center justify-between gap-4">
                        <span className={cn("text-[12.5px]", done ? "text-fg2 line-through" : "text-fg")}>
                          {label as string}
                        </span>
                        <span className={cn("font-mono text-[10px] uppercase tracking-[0.14em]", done ? "text-mint" : "text-amber")}>
                          {done ? "done" : "pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function FinalCTA() {
  return (
    <section id="cta" className="relative overflow-hidden border-t border-line py-28 md:py-40">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[1000px] -translate-x-1/2 -translate-y-1/2 blur-[140px]"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, var(--accent), transparent 60%), radial-gradient(ellipse at 75% 50%, var(--mint), transparent 60%)",
          opacity: "var(--glow-a)",
        }}
        aria-hidden
      />
      <div className="tech-cols pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Label tone="mint">09 / start</Label>
            <h2 className="display mt-7 text-[clamp(2.3rem,5.8vw,4.4rem)] font-medium leading-[0.98] text-fg">
              Your idea already has a shape.{" "}
              <span className="text-fg2">Find the people who fit it.</span>
            </h2>
            <p className="mx-auto mt-7 max-w-md text-[15px] leading-[1.7] text-fg2">
              Build a profile in about six minutes. We&apos;ll show you the events that fit your term
              and the builders who close your gaps.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/sign-in">
                <Button size="lg" className="group">
                  Request access
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/discover">
                <Button size="lg" variant="outline"><Sparkles size={14} /> Browse the index</Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg3">
              <span>onboarding 6 min</span>
              <span className="hidden h-3 w-px bg-line sm:block" />
              <span>college email required</span>
              <span className="hidden h-3 w-px bg-line sm:block" />
              <span>always free for students</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid grid-cols-2 gap-y-10 border-b border-line py-14 md:grid-cols-12">
          <div className="col-span-2 md:col-span-5">
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-fg">HackMate</span>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-fg2">
              A teammate layer for college hackathons. Built by people who spent too many nights
              scrolling group chats.
            </p>
            <div className="mt-6">
              
            </div>
          </div>
          {[
            ["Platform", ["Matching", "Hackathons", "Teams", "Projects"]],
            ["Builders", ["Profiles", "Skill graph", "Availability", "Requests"]],
            ["Company", ["Campus reps", "Changelog", "Privacy", "Contact"]],
          ].map(([t, items]) => (
            <div key={t as string} className="md:col-span-2">
              <Label tone="muted">{t as string}</Label>
              <ul className="mt-4 space-y-2.5">
                {(items as string[]).map((i) => (
                  <li key={i}>
                    <button
                      onClick={() => scrollToId("top")}
                      className="text-[13px] text-fg3 transition-colors hover:text-fg"
                    >
                      {i}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 py-6 font-mono text-[10px] uppercase tracking-[0.16em] text-fg3 md:flex-row md:items-center md:justify-between">
          <span>© 2026 Hackmate Labs — made on campus</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mint" />
              all systems operational
            </span>
            <span>BLR · 22.4°N</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
