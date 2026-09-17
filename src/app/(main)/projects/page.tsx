"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderKanban, Plus, X, Loader2, ChevronDown } from "lucide-react";
import { useApiStore } from "@/client/store/apiStore";
import { cn } from "@/client/utils/cn";
import {
  Button,
  EmptyState,
  Label,
  Meter,
  Panel,
  Reveal,
} from "@/components/ui";
import { useGuestAuth } from "@/components/shared/GuestAuthModal";

type Project = {
  id: string;
  name: string;
  description: string | null;
  teamId: string;
  createdAt: string;
};

type ProjectWithRoadmap = Project & {
  roadmap?: {
    steps: Array<{ done: boolean }>;
    version: number;
  } | null;
};

function ProjectCard({ project }: { project: ProjectWithRoadmap }) {
  const steps = project.roadmap?.steps ?? [];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : null;

  return (
    <Link href={`/projects/${project.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.18 }}
        className="group border border-line bg-surface p-5 transition-colors hover:border-accent-line"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FolderKanban size={13} className="shrink-0 text-accent" />
              <span className="truncate text-[13px] font-medium text-fg">{project.name}</span>
            </div>
            {project.description && (
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-fg3">
                {project.description}
              </p>
            )}
          </div>
          {project.roadmap && (
            <span className="shrink-0 border border-accent-line bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
              v{project.roadmap.version}
            </span>
          )}
        </div>

        {steps.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg3">roadmap</span>
              <span className="font-mono text-[9px] tnum text-fg3">{doneCount}/{steps.length}</span>
            </div>
            <Meter value={pct ?? 0} tone={pct === 100 ? "mint" : "accent"} />
          </div>
        )}

        {!project.roadmap && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber opacity-70" />
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg3">no roadmap yet</span>
          </div>
        )}

        <div className="mt-3 font-mono text-[9px] tnum text-fg3">
          {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </motion.div>
    </Link>
  );
}

function CreateProjectModal({ teamId, onClose, onCreated }: { teamId: string; onClose: () => void; onCreated: (p: Project) => void }) {
  const pushToast = useApiStore((s) => s.pushToast);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      pushToast({ label: "Name too short", body: "Project name must be at least 3 characters.", tone: "warn" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, name: trimmedName, description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast({ label: "Failed to create project", body: data.error?.message ?? "Please try again.", tone: "bad" });
        return;
      }
      pushToast({ label: "Project created", body: trimmedName, tone: "good" });
      onCreated(data.data);
      onClose();
    } catch {
      pushToast({ label: "Network error", body: "Could not create project.", tone: "bad" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[75] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-[#05070c]/70 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.99 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md border border-line-strong bg-surface"
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <Label tone="accent">New Project</Label>
          <button onClick={onClose} className="text-fg3 transition-colors hover:text-fg" aria-label="Close"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label className="font-mono text-[10.5px] uppercase tracking-wider text-fg2">Project name <span className="text-accent">*</span></label>
            <input
              autoFocus required minLength={3} maxLength={100}
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="My Hackathon Project"
              className="w-full border border-line bg-raised px-3.5 py-2.5 font-mono text-[13px] text-fg placeholder:text-fg3 focus:border-accent-line focus:outline-none"
            />
            <span className="block font-mono text-[9px] text-fg3">{name.length}/100</span>
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[10.5px] uppercase tracking-wider text-fg2">Description</label>
            <textarea
              rows={3} maxLength={2000}
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you building? The AI will use this to generate a tailored roadmap."
              className="w-full resize-none border border-line bg-raised px-3.5 py-2.5 font-mono text-[12px] text-fg placeholder:text-fg3 focus:border-accent-line focus:outline-none"
            />
            <span className="block font-mono text-[9px] text-fg3">{description.length}/2000</span>
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="font-mono text-[11px] uppercase tracking-wider text-fg3 transition-colors hover:text-fg">Cancel</button>
            <Button type="submit" disabled={loading || name.trim().length < 3}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create project
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ProjectsContent() {
  const { requireAuth } = useGuestAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const teams = useApiStore((s) => s.teams);
  const activeTeamId = useApiStore((s) => s.activeTeamId);
  const setActiveTeam = useApiStore((s) => s.setActiveTeam);

  const urlTeamId = searchParams.get("teamId");
  const [selectedTeamId, setSelectedTeamId] = useState<string>(urlTeamId ?? activeTeamId ?? teams[0]?.id ?? "");
  const [projects, setProjects] = useState<ProjectWithRoadmap[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [teamDropdown, setTeamDropdown] = useState(false);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? teams[0];

  const loadProjects = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects?teamId=${teamId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message ?? "Failed to load projects."); return; }
      const detailed = await Promise.all(
        (data.data as Project[]).map(async (p) => {
          try {
            const dr = await fetch(`/api/projects/${p.id}`);
            if (!dr.ok) return p as ProjectWithRoadmap;
            const dd = await dr.json();
            return { ...p, roadmap: dd.data?.roadmap ?? null } as ProjectWithRoadmap;
          } catch { return p as ProjectWithRoadmap; }
        })
      );
      setProjects(detailed);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadProjects(selectedTeamId);
    } else {
      // Load public projects if no team is selected
      fetch('/api/projects')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.data)) {
            setProjects(d.data as ProjectWithRoadmap[]);
          }
        })
        .catch(() => {});
    }
  }, [selectedTeamId, loadProjects]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-10">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label tone="accent">Projects</Label>
            <h1 className="display mt-1 text-[28px] text-fg">Build in public.</h1>
            <p className="mt-1 text-[13px] text-fg3">
              Generate AI roadmaps for your hackathon builds and track shipping milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {teams.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setTeamDropdown(!teamDropdown)}
                  className="flex items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[12px] text-fg"
                >
                  <span>{selectedTeam?.name ?? "Select team"}</span>
                  <ChevronDown size={13} />
                </button>
                {teamDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-48 border border-line bg-surface py-1 shadow-lg">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTeamId(t.id);
                          setActiveTeam(t.id);
                          setTeamDropdown(false);
                        }}
                        className="w-full px-3 py-1.5 text-left font-mono text-[12px] text-fg hover:bg-raised"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Button onClick={() => requireAuth("create a project roadmap", () => setShowCreate(true))}>
              <Plus size={13} /> New project
            </Button>
          </div>
        </div>
      </Reveal>

      <div className="mt-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse border border-line bg-surface p-5">
                <div className="h-3.5 w-3/4 rounded bg-line" />
                <div className="mt-2 h-3 w-1/2 rounded bg-line" />
                <div className="mt-4 h-1.5 w-full rounded-full bg-line" />
              </div>
            ))}
          </div>
        )}
        {error && !loading && (
          <Panel className="py-10 text-center">
            <p className="text-[13px] text-fg3">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => selectedTeamId && loadProjects(selectedTeamId)}>Retry</Button>
          </Panel>
        )}
        {!loading && !error && projects.length === 0 && selectedTeamId && (
          <EmptyState
            title="No projects yet"
            body="Create a project to generate an AI roadmap for your hackathon build."
            action={<Button onClick={() => requireAuth("create a project roadmap", () => setShowCreate(true))}><Plus size={13} /> Create first project</Button>}
          />
        )}
        {!loading && !error && !selectedTeamId && teams.length === 0 && (
          <EmptyState title="No teams found" body="Join or create a team first — projects are scoped to a team." action={<Link href="/teams"><Button variant="outline">Go to Teams</Button></Link>} />
        )}
        {!loading && !error && projects.length > 0 && (
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, i) => (
                <Reveal key={project.id} delay={i * 40}>
                  <ProjectCard project={project} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        )}
      </div>

      <AnimatePresence>
        {showCreate && selectedTeamId && (
          <CreateProjectModal teamId={selectedTeamId} onClose={() => setShowCreate(false)} onCreated={(p) => setProjects((prev) => [{ ...p, roadmap: null }, ...prev])} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>}>
      <ProjectsContent />
    </Suspense>
  );
}
