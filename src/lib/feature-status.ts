export type FeatureStatusLevel =
  | 'LIVE'
  | 'BETA'
  | 'UNDER_DEVELOPMENT'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'COMING_SOON'
  | 'DEPRECATED';

export type FeatureConfig = {
  key: string;
  name: string;
  status: FeatureStatusLevel;
  headline?: string;
  description: string;
  badgeText: string;
  badgeVariant: 'live' | 'beta' | 'wip' | 'warn' | 'muted';
};

export const FEATURE_REGISTRY: Record<string, FeatureConfig> = {
  hackathons: {
    key: 'hackathons',
    name: 'Hackathon Discovery',
    status: 'LIVE',
    headline: 'Real Hackathon Ingestion',
    description: 'Continuously updated hackathons aggregated from Unstop, Devfolio, and community submissions with verified dates and prize pools.',
    badgeText: 'LIVE DATA',
    badgeVariant: 'live',
  },
  builders: {
    key: 'builders',
    name: 'Builder Directory',
    status: 'BETA',
    headline: 'Student Builder Profiles',
    description: 'Public profiles showcasing verified GitHub repos, LeetCode performance, skills, and weekly availability.',
    badgeText: 'BETA',
    badgeVariant: 'beta',
  },
  matching: {
    key: 'matching',
    name: 'Smart Matchmaking',
    status: 'BETA',
    headline: 'Skill & Time Complement',
    description: 'Calculates team skill gap closures, commitment windows, and intent alignment to pair compatible builders.',
    badgeText: 'BETA',
    badgeVariant: 'beta',
  },
  skill_graph: {
    key: 'skill_graph',
    name: 'Skill Graph',
    status: 'BETA',
    headline: 'Interactive Skill Taxonomy',
    description: 'Visual taxonomy connecting builders across interface, core systems, intelligent systems, and design clusters.',
    badgeText: 'BETA',
    badgeVariant: 'beta',
  },
  teams: {
    key: 'teams',
    name: 'Team Assembly',
    status: 'LIVE',
    headline: 'Form & Join Hackathon Squads',
    description: 'Create teams, define open roles, invite builders, and manage team submissions in one place.',
    badgeText: 'LIVE',
    badgeVariant: 'live',
  },
  projects: {
    key: 'projects',
    name: 'Project Roadmaps & Portfolios',
    status: 'BETA',
    headline: 'Build in Public',
    description: 'Track hackathon submissions, live demo links, and AI-assisted roadmap milestones.',
    badgeText: 'BETA',
    badgeVariant: 'beta',
  },
  chat: {
    key: 'chat',
    name: 'Realtime Team Chat',
    status: 'UNDER_DEVELOPMENT',
    headline: 'In Active Development',
    description: 'We are finishing end-to-end encrypted realtime team communication and Pusher sync.',
    badgeText: 'UNDER DEVELOPMENT',
    badgeVariant: 'wip',
  },
  ai_matching: {
    key: 'ai_matching',
    name: 'AI Agent Matchmaker',
    status: 'COMING_SOON',
    headline: 'Stage 3 Roadmap',
    description: 'Autonomous agent that crawls project requirements to actively suggest the best-fit student builders.',
    badgeText: 'COMING SOON',
    badgeVariant: 'muted',
  },
  reports: {
    key: 'reports',
    name: 'Problem Reporting',
    status: 'LIVE',
    headline: 'Direct to Student Maintainers',
    description: 'Anonymous or authenticated bug reporting with auto page detection and triage pipeline.',
    badgeText: 'LIVE',
    badgeVariant: 'live',
  },
  careers: {
    key: 'careers',
    name: 'Student Contributor Program',
    status: 'LIVE',
    headline: 'Help Build HackMate',
    description: 'Open source opportunities for frontend, backend, ML, UI/UX, and campus representatives.',
    badgeText: 'OPEN ROLES',
    badgeVariant: 'live',
  },
};

export function getFeatureStatus(key: string): FeatureConfig {
  return (
    FEATURE_REGISTRY[key] ?? {
      key,
      name: key,
      status: 'BETA',
      headline: 'Beta Feature',
      description: 'This feature is currently in active testing.',
      badgeText: 'BETA',
      badgeVariant: 'beta',
    }
  );
}
