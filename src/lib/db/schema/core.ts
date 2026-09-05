import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const colleges = pgTable(
  'colleges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    shortName: text('short_name'),
    domain: text('domain').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    domainUnique: uniqueIndex('colleges_domain_unique_idx').on(table.domain),
  }),
);

export const profiles = pgTable(
  'profiles',
  {
    id: text('id').primaryKey(),
    studentCode: text('student_code'),
    email: text('email'),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),
    username: text('username').notNull(),
    bio: text('bio'),
    collegeId: uuid('college_id').references(() => colleges.id, { onDelete: 'set null' }),
    branch: text('branch'),
    graduationYear: integer('graduation_year'),
    skills: text('skills').array().notNull().default([]),
    rolePreference: text('role_preference'),
    hackathonInterests: text('hackathon_interests').array().notNull().default([]),
    availability: text('availability'),
    portfolioUrl: text('portfolio_url'),
    linkedinUrl: text('linkedin_url'),
    githubUsername: text('github_username'),
    leetcodeUsername: text('leetcode_username'),
    onboardingDone: boolean('onboarding_done').notNull().default(false),
    profileComplete: integer('profile_complete').notNull().default(0),
    isOpenToTeam: boolean('is_open_to_team').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    studentCodeUnique: uniqueIndex('profiles_student_code_unique_idx').on(table.studentCode),
    usernameUnique: uniqueIndex('profiles_username_unique_idx').on(table.username),
    emailUnique: uniqueIndex('profiles_email_unique_idx').on(table.email),
    collegeIdx: index('profiles_college_idx').on(table.collegeId),
    openToTeamIdx: index('profiles_open_to_team_idx').on(table.isOpenToTeam),
    skillsGinIdx: index('profiles_skills_gin_idx').using('gin', table.skills),
  }),
);

export const githubData = pgTable(
  'github_data',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    username: text('username'),
    profileUrl: text('profile_url'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    publicRepos: integer('public_repos').notNull().default(0),
    followers: integer('followers').notNull().default(0),
    following: integer('following').notNull().default(0),
    languages: jsonb('languages').$type<Record<string, number>>().notNull().default({}),
    publicRepositoryCount: integer('public_repository_count').notNull().default(0),
    syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userUnique: uniqueIndex('github_data_user_unique_idx').on(table.userId),
    usernameIdx: index('github_data_username_idx').on(table.username),
  }),
);

export const leetcodeData = pgTable(
  'leetcode_data',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    totalSolved: integer('total_solved').notNull().default(0),
    easySolved: integer('easy_solved').notNull().default(0),
    mediumSolved: integer('medium_solved').notNull().default(0),
    hardSolved: integer('hard_solved').notNull().default(0),
    ranking: integer('ranking'),
    contestRating: integer('contest_rating'),
    contestsAttended: integer('contests_attended').notNull().default(0),
    syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userUnique: uniqueIndex('leetcode_data_user_unique_idx').on(table.userId),
    usernameIdx: index('leetcode_data_username_idx').on(table.username),
  }),
);

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    eventType: text('event_type').notNull(),
    status: text('status').notNull().default('processing'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    providerTypeIdx: index('webhook_events_provider_type_idx').on(table.provider, table.eventType),
    statusIdx: index('webhook_events_status_idx').on(table.status),
  }),
);

export const hackathons = pgTable(
  'hackathons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    canonicalKey: text('canonical_key').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    organizer: text('organizer'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    registrationDeadlineAt: timestamp('registration_deadline_at', { withTimezone: true }),
    timezone: text('timezone').notNull().default('UTC'),
    mode: text('mode'),
    location: text('location'),
    teamSizeMin: integer('team_size_min'),
    teamSizeMax: integer('team_size_max'),
    prizeAmount: numeric('prize_amount', { precision: 14, scale: 2 }),
    prizeCurrency: text('prize_currency').notNull().default('INR'),
    prizeDisplay: text('prize_display'),
    themes: text('themes').array().notNull().default([]),
    techStack: text('tech_stack').array().notNull().default([]),
    registrationUrl: text('registration_url'),
    sourceUrl: text('source_url'),
    status: text('status').notNull().default('published'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (table) => ({
    canonicalKeyUnique: uniqueIndex('hackathons_canonical_key_unique_idx').on(table.canonicalKey),
    deadlineIdx: index('hackathons_deadline_idx').on(table.registrationDeadlineAt),
    statusDeadlineIdx: index('hackathons_status_deadline_idx').on(
      table.status,
      table.registrationDeadlineAt,
    ),
  }),
);

export const hackathonSources = pgTable(
  'hackathon_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    hackathonId: uuid('hackathon_id')
      .notNull()
      .references(() => hackathons.id, { onDelete: 'cascade' }),
    source: text('source').notNull(),
    sourceId: text('source_id').notNull(),
    sourceUrl: text('source_url'),
    registrationUrl: text('registration_url'),
    payloadHash: text('payload_hash'),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdentityUnique: uniqueIndex('hackathon_sources_source_id_unique_idx').on(
      table.source,
      table.sourceId,
    ),
    hackathonIdx: index('hackathon_sources_hackathon_idx').on(table.hackathonId),
    sourceIdx: index('hackathon_sources_source_idx').on(table.source),
  }),
);

export const ingestionRuns = pgTable(
  'ingestion_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    externalRunId: text('external_run_id'),
    source: text('source').notNull(),
    status: text('status').notNull().default('running'),
    totalReceived: integer('total_received').notNull().default(0),
    createdCount: integer('created_count').notNull().default(0),
    updatedCount: integer('updated_count').notNull().default(0),
    rejectedCount: integer('rejected_count').notNull().default(0),
    errors: jsonb('errors').$type<string[]>().notNull().default([]),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => ({
    externalRunUnique: uniqueIndex('ingestion_runs_external_run_unique_idx').on(table.externalRunId),
    sourceStatusIdx: index('ingestion_runs_source_status_idx').on(table.source, table.status),
  }),
);

export const hackathonBookmarks = pgTable(
  'hackathon_bookmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    hackathonId: uuid('hackathon_id').notNull().references(() => hackathons.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userHackathonUnique: uniqueIndex('hackathon_bookmarks_user_hackathon_unique_idx').on(
      table.userId,
      table.hackathonId,
    ),
    userIdx: index('hackathon_bookmarks_user_idx').on(table.userId),
  }),
);

export const hackathonInterests = pgTable(
  'hackathon_interests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    hackathonId: uuid('hackathon_id').notNull().references(() => hackathons.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userHackathonUnique: uniqueIndex('hackathon_interests_user_hackathon_unique_idx').on(
      table.userId,
      table.hackathonId,
    ),
    userIdx: index('hackathon_interests_user_idx').on(table.userId),
  }),
);

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    hackathonId: uuid('hackathon_id').references(() => hackathons.id, { onDelete: 'set null' }),
    leaderId: text('leader_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    maxMembers: integer('max_members').notNull().default(4),
    rolesNeeded: text('roles_needed').array().notNull().default([]),
    isOpen: boolean('is_open').notNull().default(true),
    status: text('status').notNull().default('forming'),
    result: text('result'),
    resultNote: text('result_note'),
    projectName: text('project_name'),
    projectUrl: text('project_url'),
    demoUrl: text('demo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    leaderIdx: index('teams_leader_idx').on(table.leaderId),
    hackathonIdx: index('teams_hackathon_idx').on(table.hackathonId),
    openStatusIdx: index('teams_open_status_idx').on(table.isOpen, table.status),
  }),
);

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    role: text('role'),
    status: text('status').notNull().default('active'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamUserUnique: uniqueIndex('team_members_team_user_unique_idx').on(table.teamId, table.userId),
    teamIdx: index('team_members_team_idx').on(table.teamId),
    userIdx: index('team_members_user_idx').on(table.userId),
  }),
);

export const teamRequests = pgTable(
  'team_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: text('type').notNull().default('direct'),
    fromUserId: text('from_user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    toUserId: text('to_user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    hackathonId: uuid('hackathon_id').references(() => hackathons.id, { onDelete: 'set null' }),
    message: text('message'),
    roleOffered: text('role_offered'),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    fromUserIdx: index('team_requests_from_user_idx').on(table.fromUserId, table.status),
    toUserIdx: index('team_requests_to_user_idx').on(table.toUserId, table.status),
    teamIdx: index('team_requests_team_idx').on(table.teamId),
  }),
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    href: text('href'),
    dedupeKey: text('dedupe_key'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index('notifications_user_created_idx').on(table.userId, table.createdAt),
    userReadIdx: index('notifications_user_read_idx').on(table.userId, table.readAt),
    dedupeUnique: uniqueIndex('notifications_dedupe_unique_idx').on(table.dedupeKey),
  }),
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventType: text('event_type').notNull(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusAvailableIdx: index('outbox_events_status_available_idx').on(
      table.status,
      table.availableAt,
    ),
    aggregateIdx: index('outbox_events_aggregate_idx').on(table.aggregateType, table.aggregateId),
  }),
);

export const teamMessages = pgTable(
  'team_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamCreatedIdx: index('team_messages_team_created_idx').on(table.teamId, table.createdAt),
    userIdx: index('team_messages_user_idx').on(table.userId),
  }),
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userAId: text('user_a_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    userBId: text('user_b_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pairUnique: uniqueIndex('conversations_pair_unique_idx').on(table.userAId, table.userBId),
    userAIdx: index('conversations_user_a_idx').on(table.userAId),
    userBIdx: index('conversations_user_b_idx').on(table.userBId),
  }),
);

export const directMessages = pgTable(
  'direct_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    conversationCreatedIdx: index('direct_messages_conversation_created_idx').on(
      table.conversationId,
      table.createdAt,
    ),
    senderIdx: index('direct_messages_sender_idx').on(table.senderId),
  }),
);

export const connectedAccounts = pgTable(
  'connected_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'leetcode'
    providerUsername: text('provider_username').notNull(),
    providerUserId: text('provider_user_id'),
    verificationCode: text('verification_code'),
    verificationStatus: text('verification_status').notNull().default('pending'), // 'pending' | 'verified' | 'failed'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  },
  (table) => ({
    userProviderUnique: uniqueIndex('connected_accounts_user_provider_unique_idx').on(
      table.userId,
      table.provider,
    ),
    providerUsernameUnique: uniqueIndex('connected_accounts_provider_username_unique_idx').on(
      table.provider,
      table.providerUsername,
    ),
    verificationStatusIdx: index('connected_accounts_status_idx').on(table.verificationStatus),
  }),
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type College = typeof colleges.$inferSelect;
export type GithubData = typeof githubData.$inferSelect;
export type LeetcodeData = typeof leetcodeData.$inferSelect;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type NewConnectedAccount = typeof connectedAccounts.$inferInsert;
export type Hackathon = typeof hackathons.$inferSelect;
export type HackathonSource = typeof hackathonSources.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TeamRequest = typeof teamRequests.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type TeamMessage = typeof teamMessages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type DirectMessage = typeof directMessages.$inferSelect;
