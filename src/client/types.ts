export type RoleKey =
  | "frontend"
  | "backend"
  | "ml"
  | "design"
  | "product"
  | "mobile"
  | "devops";

export const ROLES: RoleKey[] = [
  "frontend",
  "backend",
  "ml",
  "design",
  "product",
  "mobile",
  "devops",
];

export const ROLE_LABEL: Record<RoleKey, string> = {
  frontend: "Frontend",
  backend: "Backend",
  ml: "AI / ML",
  design: "Design",
  product: "Product",
  mobile: "Mobile",
  devops: "DevOps",
};

export type Skill = {
  id: string;
  cluster: string;
  label: string;
  level: number;
  verified?: boolean;
};

export type AvailabilitySlot = { day: number; start: number; end: number };

export type Builder = {
  id: string;
  studentCode?: string;
  handle: string;
  name: string;
  initials: string;
  college: string;
  year: number;
  branch: string;
  city: string;
  role: RoleKey;
  secondary: RoleKey[];
  avatar?: string;
  avatarUrl?: string;
  goal: "win" | "learn" | "ship";
  bio: string;
  skills: Skill[];
  repos: { name: string; lang: string; stars: number; url: string }[];
  projects: {
    id: string;
    name: string;
    role: string;
    year: number;
    outcome: string;
    url?: string;
  }[];
  events: { hackathonId: string; year: number; placement?: string }[];
  availability: AvailabilitySlot[];
  weeklyHours: number;
  openToTeams: boolean;
  verified: boolean;
  lastActive: string;
};

export type Hackathon = {
  id: string;
  code: string;
  name: string;
  host: string;
  city: string;
  mode: "onsite" | "remote" | "hybrid";
  durationHours: number;
  startDate: string;
  registerDeadline: string;
  track: string;
  tracks: string[];
  prize: number;
  currency: "INR";
  maxTeamSize: number;
  minTeamSize: number;
  registrationUrl?: string;
  demand: "low" | "medium" | "high";
  trackDemands: Partial<Record<RoleKey, number>>;
  description: string;
  status: "open" | "closing" | "closed";
};

export type TeamMember = { builderId: string; role: RoleKey; joinedAt: string };

export type Team = {
  id: string;
  name: string;
  hackathonId: string;
  ownerId: string;
  members: TeamMember[];
  openSlots: { role: RoleKey; note: string }[];
  project?: string;
  maxMembers?: number;
  visibility: "private" | "discoverable";
  leaderId?: string;
  rolesNeeded?: string[];
  isOpen?: boolean;
  status?: string;
  result?: string;
  resultNote?: string;
  projectName?: string;
  projectUrl?: string;
  demoUrl?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RequestState =
  | "new"
  | "reviewing"
  | "accepted"
  | "declined"
  | "withdrawn";

export type CollabRequest = {
  id: string;
  fromId: string;
  toId?: string;
  teamId: string;
  role: RoleKey;
  message: string;
  score: number;
  state: RequestState;
  createdAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  ownerId: string | null;
  column: "todo" | "doing" | "done";
  due?: string;
};

export type LogEntry = {
  id: string;
  projectId: string;
  at: string;
  label: string;
  state: "done" | "active" | "todo";
  progress?: number;
};

export type Project = {
  id: string;
  name: string;
  teamId: string;
  hackathonId: string;
  tasks: Task[];
  log: LogEntry[];
  checklist: { id: string; label: string; done: boolean }[];
  commitCount: number;
  commitsByDay: number[];
  submissionAt: string;
  notes: string;
};

export type Notification = {
  id: string;
  kind: "request" | "deadline" | "match" | "team";
  title: string;
  body: string;
  at: string;
  read: boolean;
  href: string;
};

export type { LeaderboardEntry } from './store/apiStore';
