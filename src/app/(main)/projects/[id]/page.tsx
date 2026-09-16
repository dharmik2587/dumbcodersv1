"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { motion } from "framer-motion";
import { ArrowLeft, GripVertical, Plus } from "lucide-react";
import { useStore } from "@/client/store/useStore";
import { useApiStore, byIdMap } from "@/client/store/apiStore";
import { Avatar, relTime } from "@/components/shared";
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
  Textarea,
} from "@/components/ui";
import { ThemedLine, useChartTokens } from "@/components/charts";
import { cn } from "@/client/utils/cn";
import type { Task } from "@/client/types";

type RealProject = {
  id: string;
  name: string;
  description: string | null;
  teamId: string;
  createdAt: string;
};

const COLUMNS = [
  { id: "todo", label: "Todo", tone: "text-fg3" },
  { id: "doing", label: "In progress", tone: "text-amber" },
  { id: "done", label: "Done", tone: "text-mint" },
] as const;

type Col = (typeof COLUMNS)[number]["id"];

export default function ProjectWorkspace() {
  const { id } = useParams();
  const projects = useStore((s) => s.projects);
  const teams = useApiStore((s) => s.teams);
  const builders = useApiStore((s) => s.builders);
  const hackathons = useApiStore((s) => s.hackathons);
  const moveTask = useStore((s) => s.moveTask);
  const addTask = useStore((s) => s.addTask);
  const toggleChecklist = useStore((s) => s.toggleChecklist);
  const setNotes = useStore((s) => s.setNotes);
  const pushToast = useApiStore((s) => s.pushToast);
  const byId = useMemo(() => byIdMap(builders), [builders]);
  const t = useChartTokens();

  // Dual-path: try real API first, fall back to mock store
  const [realProject, setRealProject] = useState<RealProject | null>(null);
  const [fetchingReal, setFetchingReal] = useState(true);

  useEffect(() => {
    if (!id) return;
    setFetchingReal(true);
    fetch(`/api/projects/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.data?.project) setRealProject(data.data.project);
      })
      .catch(() => {})
      .finally(() => setFetchingReal(false));
  }, [id]);

  const [draft, setDraft] = useState<Record<Col, string>>({ todo: "", doing: "", done: "" });
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Col | null>(null);

  const project = projects.find((p) => p.id === id);
  const hasRealData = Boolean(realProject);

  // Show not-found only if: no real project AND not still loading AND not in mock store
  if (!fetchingReal && !realProject && !project)
    return (
      <EmptyState
        title="Project not found"
        body="This project doesn't exist or you don't have access."
        action={<Link href="/projects"><Button variant="outline"><ArrowLeft size={13} /> Back to projects</Button></Link>}
      />
    );

  // If still loading and not in mock store, show skeleton
  if (fetchingReal && !project)
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 animate-pulse">
        <div className="h-6 w-48 rounded bg-line" />
        <div className="h-10 w-96 rounded bg-line" />
        <div className="h-4 w-64 rounded bg-line" />
      </div>
    );

  // Prefer real data for display; fall back to mock
  const displayName = realProject?.name ?? project?.name ?? "Project";
  const displayDesc = realProject?.description ?? project?.notes ?? "";
  const teamId = realProject?.teamId ?? project?.teamId ?? "";

  const team = teams.find((x) => x.id === teamId);
  const hack = project ? hackathons.find((h) => h.id === project.hackathonId) : null;
  const doneCount = project?.checklist.filter((c) => c.done).length ?? 0;
  const totalChecklist = project?.checklist.length ?? 0;
  const ms = project ? new Date(project.submissionAt).getTime() - Date.now() : 0;
  const hours = Math.max(0, Math.floor(ms / 3_600_000));
  const openTasks = project?.tasks.filter((x) => x.column !== "done").length ?? 0;
  const ownerGaps = project?.tasks.filter((x) => !x.ownerId && x.column !== "done").length ?? 0;

  const drop = (col: Col) => {
    if (!dragging || !project) return;
    moveTask(project.id, dragging, col);
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-6">
          <div>
            {/* Breadcrumb */}
            <Link
              href="/projects"
              className="mb-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg3 transition-colors hover:text-fg"
            >
              <ArrowLeft size={11} />
              Projects
            </Link>
            <Label tone="accent">
              <span className="text-fg3">project</span> / {displayName}
            </Label>
            <h1 className="display mt-3 text-[clamp(1.8rem,3.8vw,2.9rem)] font-medium leading-tight text-fg">
              {displayName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-fg3">
              {team && <span>{team.name}</span>}
              {hack && <><span>·</span><span>{hack.name}</span></>}
              {displayDesc && <><span>·</span><span className="max-w-xs truncate">{displayDesc}</span></>}
              {project && <><span>·</span><span>T-{hours}h</span></>}
            </div>
          </div>
          {team && (
            <div className="flex -space-x-2">
              {team.members.map((m) => {
                const b = byId.get(m.builderId);
                return b ? <Avatar key={m.builderId} b={b} size={30} /> : null;
              })}
            </div>
          )}
        </div>
      </Reveal>

      {/* stat strip — only shown when mock project data is available */}
      {project && (
      <Reveal delay={60}>
        <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {[
            ["commits", project.commitCount],
            ["open tasks", openTasks],
            ["owner gaps", ownerGaps],
            ["checklist", `${doneCount}/${project.checklist.length}`],
          ].map(([k, v], i) => (
            <div key={k as string} className="bg-surface px-5 py-4">
              <div className="mono-label text-fg3">{k}</div>
              <div
                className={cn(
                  "mt-1.5 font-mono text-[24px] tnum",
                  k === "owner gaps" && Number(v) > 0 ? "text-amber" : "text-fg",
                )}
              >
                {v}
              </div>
              {i === 3 && (
                <div className="mt-2">
                  <Meter value={(doneCount / project.checklist.length) * 100} tone={doneCount === project.checklist.length ? "mint" : "amber"} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Reveal>
      )}

      <div className="grid gap-6 py-8 lg:grid-cols-12">
        {/* board */}
        <div className="lg:col-span-8">
          <Reveal>
            <div className="mb-3 flex items-center justify-between">
              <Label tone="accent">task board</Label>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">
                drag to move · ⌘+arrow also works
              </span>
            </div>
          </Reveal>
          <div className="grid gap-3 md:grid-cols-3">
            {project ? COLUMNS.map((col) => {
              const items = project.tasks.filter((x) => x.column === col.id);
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(col.id);
                  }}
                  onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
                  onDrop={() => drop(col.id)}
                  className={cn(
                    "flex min-h-[240px] flex-col border bg-surface transition-colors",
                    over === col.id ? "border-accent-line bg-accent-soft/40" : "border-line",
                  )}
                >
                  <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                    <span className={cn("mono-label", col.tone)}>{col.label}</span>
                    <span className="font-mono text-[10px] tnum text-fg3">{items.length}</span>
                  </div>

                  <div className="flex-1 space-y-2 p-2.5">
                    {items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        dragging={dragging === task.id}
                        onDragStart={() => setDragging(task.id)}
                        onDragEnd={() => {
                          setDragging(null);
                          setOver(null);
                        }}
                        ownerName={
                          task.ownerId
                            ? byId.get(task.ownerId)?.name.split(" ")[0] ?? null
                            : null
                        }
                        onKeyMove={(dir) => {
                          const i = COLUMNS.findIndex((c) => c.id === task.column);
                          const next = COLUMNS[Math.min(COLUMNS.length - 1, Math.max(0, i + dir))];
                          if (next) {
                            moveTask(project.id, task.id, next.id);
                            pushToast({ label: "Task moved", body: `${task.title} → ${next.label}`, tone: "info" });
                          }
                        }}
                      />
                    ))}
                    {items.length === 0 && (
                      <p className="px-2 py-6 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-fg3">
                        drop here
                      </p>
                    )}
                  </div>

                  <form
                    className="border-t border-line p-2.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = draft[col.id].trim();
                      if (!v) return;
                      addTask(project.id, v);
                      setDraft((d) => ({ ...d, [col.id]: "" }));
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Plus size={12} className="shrink-0 text-fg3" />
                      <input
                        value={draft[col.id]}
                        onChange={(e) => setDraft((d) => ({ ...d, [col.id]: e.target.value }))}
                        placeholder="Add task"
                        aria-label={`Add task to ${col.label}`}
                        className="w-full bg-transparent font-mono text-[11px] text-fg placeholder:text-fg3 focus:outline-none"
                      />
                    </div>
                  </form>
                </div>
              );
            }) : <p className="col-span-3 py-10 text-center font-mono text-[11px] text-fg3">Task board requires seed data</p>}
          </div>

          <Reveal delay={80}>
            <Panel className="mt-6">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">commit activity</Label>
                <span className="font-mono text-[10px] tnum text-fg3">
                  {project?.commitCount ?? 0} total
                </span>
              </div>
              <div className="px-4 py-4">
                <ThemedLine
                  height={170}
                  data={{
                    labels: ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "today"],
                    datasets: [
                      {
                      data: project?.commitsByDay ?? [0,0,0,0,0,0,0],
                        borderColor: t.accent,
                        backgroundColor: `${t.accent}22`,
                        fill: true,
                        tension: 0.32,
                        borderWidth: 1.6,
                        pointRadius: 2.5,
                        pointBackgroundColor: t.accent,
                      },
                    ],
                  }}
                />
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* right column */}
        <div className="space-y-6 lg:col-span-4">
          <Reveal delay={60}>
            <Panel ticks>
              <CornerTicks />
              <div className="border-b border-line px-5 py-3">
                <Label tone="accent">build log</Label>
              </div>
              <div className="relative px-5 py-5">
                <span className="absolute bottom-5 left-[25px] top-5 w-px bg-line" />
                {(project?.log ?? []).map((l) => (
                  <div key={l.id} className="relative flex gap-4 pb-5 last:pb-0">
                    <span
                      className={cn(
                        "relative z-10 mt-1 h-[11px] w-[11px] shrink-0 rounded-full border",
                        l.state === "done" && "border-mint-line bg-mint",
                        l.state === "active" && "border-accent bg-accent/30",
                        l.state === "todo" && "border-line-strong bg-surface",
                      )}
                    >
                      {l.state === "active" && (
                        <span className="absolute inset-0 animate-pulse-dot rounded-full bg-accent/60" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="font-mono text-[10px] tnum text-fg3">{l.at}</span>
                        <span className={cn("text-[12.5px]", l.state === "todo" ? "text-fg3" : "text-fg")}>
                          {l.label}
                        </span>
                      </div>
                      {l.progress !== undefined && (
                        <div className="mt-2 max-w-[200px]">
                          <Meter value={l.progress} tone="accent" />
                          <span className="mt-1 block font-mono text-[9px] tnum text-fg3">
                            {l.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={100}>
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">submission checklist</Label>
                <span className="font-mono text-[10px] tnum text-fg3">
                  {doneCount} of {project?.checklist.length ?? 0}
                </span>
              </div>
              <div className="space-y-2.5 px-5 py-4">
                {(project?.checklist ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (!project) return;
                      toggleChecklist(project.id, c.id);
                      pushToast({
                        label: c.done ? "Item reopened" : "Item cleared",
                        body: c.label,
                        tone: c.done ? "info" : "good",
                      });
                    }}
                    className="group flex w-full items-center justify-between gap-4 text-left"
                  >
                    <span
                      className={cn(
                        "text-[12.5px] transition-colors",
                        c.done ? "text-fg3 line-through" : "text-fg",
                      )}
                    >
                      {c.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <StateDot tone={c.done ? "mint" : "amber"} />
                      <span className={cn("font-mono text-[10px] uppercase tracking-[0.12em]", c.done ? "text-mint" : "text-amber")}>
                        {c.done ? "done" : "pending"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={120}>
            {/* AI Roadmap Panel — uses real project ID from API if available, falls back to mock project */}
            <AIRoadmapPanel
              teamId={teamId}
              projectId={realProject?.id ?? project?.id}
              projectName={displayName}
              description={displayDesc}
            />
          </Reveal>

          <Reveal delay={140}>
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Label tone="accent">shared notes</Label>
                <span className="font-mono text-[10px] text-fg3">saved locally</span>
              </div>
              <div className="p-4">
                <Textarea
                  rows={6}
                  value={project?.notes ?? ""}
                  onChange={(e) => project && setNotes(project.id, e.target.value)}
                  placeholder="Scope decisions, cut features, judging angle…"
                  className="bg-raised text-[12.5px] leading-relaxed"
                />
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-fg3">
                  {(project?.notes ?? "").length} chars · edited {relTime(new Date().toISOString())}
                </p>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={170}>
            <div className="flex flex-wrap gap-1.5">
              <Chip tone="accent">{hack?.track}</Chip>
              <Chip>{hack?.mode} · {hack?.durationHours}h</Chip>
              <Chip tone={ownerGaps > 0 ? "amber" : "mint"}>
                {ownerGaps > 0 ? `${ownerGaps} unowned` : "all owned"}
              </Chip>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  ownerName,
  onKeyMove,
}: {
  task: Task;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  ownerName: string | null;
  onKeyMove: (dir: -1 | 1) => void;
}) {
  return (
    <motion.div
      layout
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "ArrowRight") {
          e.preventDefault();
          onKeyMove(1);
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "ArrowLeft") {
          e.preventDefault();
          onKeyMove(-1);
        }
      }}
      className={cn(
        "group cursor-grab border border-line bg-raised p-3 transition-all duration-200 hover:border-line-strong active:cursor-grabbing",
        dragging && "opacity-40",
        !ownerName && task.column !== "done" && "border-l-2 border-l-amber",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={12} className="mt-0.5 shrink-0 text-fg3 opacity-0 transition-opacity group-hover:opacity-100" />
        <p className={cn("text-[12.5px] leading-snug", task.column === "done" ? "text-fg3 line-through" : "text-fg")}>
          {task.title}
        </p>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.12em]",
            ownerName ? "text-fg3" : "text-amber",
          )}
        >
          {ownerName ?? "unowned"}
        </span>
        <span className="font-mono text-[9px] tnum text-fg3">{task.id}</span>
      </div>
    </motion.div>
  );
}

function AIRoadmapPanel({ teamId, projectId, projectName, description }: { teamId: string, projectId?: string, projectName: string, description: string }) {
  const pushToast = useApiStore((s) => s.pushToast);
  const [dbProject, setDbProject] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let proj: any = null;

        // If we already have a real project ID, use it directly
        if (projectId) {
          const detailRes = await fetch(`/api/projects/${projectId}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            proj = detailData.data?.project;
            setRoadmap(detailData.data?.roadmap ?? null);
          }
        } else {
          // Fall back to search-by-name for mock project compatibility
          const res = await fetch(`/api/projects?teamId=${teamId}`);
          if (!res.ok) throw new Error('Failed to fetch projects');
          const data = await res.json();
          proj = data.data?.find((p: any) => p.name === projectName);

          if (!proj) {
            const createRes = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ teamId, name: projectName, description })
            });
            if (createRes.ok) {
              const createData = await createRes.json();
              proj = createData.data;
            }
          }

          if (proj) {
            const detailRes = await fetch(`/api/projects/${proj.id}`);
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              setRoadmap(detailData.data?.roadmap ?? null);
            }
          }
        }

        if (proj) setDbProject(proj);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teamId, projectId, projectName, description]);


  const regenerate = async () => {
    if (!dbProject) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${dbProject.id}/roadmap`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate');
      setRoadmap(data.data);
      pushToast({ label: 'Roadmap Generated', body: `Version ${data.data.version} created`, tone: 'good' });
    } catch (err: any) {
      pushToast({ label: 'Generation failed', body: err.message, tone: 'bad' });
    } finally {
      setGenerating(false);
    }
  };

  const toggleStep = async (stepId: string, done: boolean) => {
    if (!dbProject) return;
    
    setRoadmap((prev: any) => ({
      ...prev,
      steps: prev.steps.map((s: any) => s.id === stepId ? { ...s, done } : s)
    }));

    try {
      const res = await fetch(`/api/projects/${dbProject.id}/roadmap`, {
        method: 'PATCH',
        body: JSON.stringify({ stepId, done })
      });
      if (!res.ok) throw new Error('Failed to update step');
    } catch (err: any) {
      pushToast({ label: 'Update failed', body: err.message, tone: 'bad' });
      setRoadmap((prev: any) => ({
        ...prev,
        steps: prev.steps.map((s: any) => s.id === stepId ? { ...s, done: !done } : s)
      }));
    }
  };

  const steps = roadmap?.steps || [];
  const doneCount = steps.filter((s: any) => s.done).length;

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <Label tone="accent">✨ AI Roadmap</Label>
          {roadmap && <span className="font-mono text-[9px] text-fg3 uppercase tracking-wider bg-raised px-1.5 py-0.5 border border-line">v{roadmap.version}</span>}
        </div>
        <span className="font-mono text-[10px] tnum text-fg3">
          {steps.length > 0 ? `${doneCount} of ${steps.length}` : 'Not generated'}
        </span>
      </div>
      
      <div className="p-5">
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-line rounded w-3/4"></div>
            <div className="h-4 bg-line rounded w-1/2"></div>
            <div className="h-4 bg-line rounded w-5/6"></div>
          </div>
        ) : steps.length > 0 ? (
          <>
            <div className="mb-4">
              <Meter value={(doneCount / steps.length) * 100} tone={doneCount === steps.length ? 'mint' : 'accent'} />
            </div>
            <div className="space-y-2.5">
              {steps.sort((a: any, b: any) => a.order - b.order).map((step: any) => (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step.id, !step.done)}
                  className="group flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className={cn("text-[12.5px] transition-colors", step.done ? "text-fg3 line-through" : "text-fg")}>
                    {step.order}. {step.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <StateDot tone={step.done ? "mint" : "amber"} />
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-line text-center">
              <Button onClick={regenerate} disabled={generating} variant="outline" className="w-full text-xs">
                {generating ? 'Generating...' : '✨ Regenerate Roadmap'}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-[12.5px] text-fg3 mb-4">No roadmap generated yet.</p>
            <Button onClick={regenerate} disabled={generating}>
              {generating ? 'Generating...' : '✨ Generate AI Roadmap'}
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
