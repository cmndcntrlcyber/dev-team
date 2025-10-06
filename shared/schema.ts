import { pgTable, text, serial, integer, boolean, timestamp, json, decimal, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Google authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table updated for Google authentication
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Software Development Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  repositoryUrl: text("repository_url"),
  status: text("status").notNull().default("planning"), // planning, active, maintenance, archived, on-hold
  methodology: text("methodology").default("agile"), // kanban, agile, lean, six-sigma, waterfall
  priority: text("priority").default("medium"), // low, medium, high, critical
  teamSize: text("team_size").default("small"), // small (1-5), medium (6-15), large (16+)
  techStack: json("tech_stack").$type<string[]>().default([]), // Technologies used
  tags: json("tags").$type<string[]>().default([]),
  objectives: json("objectives").$type<string[]>().default([]),
  teamLead: text("team_lead"),
  teamMembers: json("team_members").$type<string[]>().default([]),
  startDate: timestamp("start_date"),
  targetReleaseDate: timestamp("target_release_date"),
  actualReleaseDate: timestamp("actual_release_date"),
  githubRepo: text("github_repo"),
  jenkinsPipeline: text("jenkins_pipeline"),
  cloudflareZone: text("cloudflare_zone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Development Environments (Dev, Staging, Production)
export const environments = pgTable("environments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(), // e.g., "Development", "Staging", "Production"
  type: text("type").notNull(), // development, staging, production, testing
  url: text("url"), // Deployment URL
  status: text("status").notNull().default("inactive"), // active, inactive, deploying, error
  healthStatus: text("health_status").default("unknown"), // healthy, degraded, down, unknown
  version: text("version"), // Current deployed version
  lastDeployment: timestamp("last_deployment"),
  lastHealthCheck: timestamp("last_health_check"),
  tags: json("tags").$type<string[]>().default([]),
  configuration: json("configuration").$type<Record<string, any>>().default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sprints for Agile project management
export const sprints = pgTable("sprints", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  goal: text("goal"),
  sprintNumber: integer("sprint_number"),
  status: text("status").notNull().default("planned"), // planned, active, completed, cancelled
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  velocity: integer("velocity"), // Story points completed
  plannedPoints: integer("planned_points"),
  completedPoints: integer("completed_points"),
  burndownData: json("burndown_data").$type<any[]>().default([]),
  retrospectiveNotes: text("retrospective_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Development Tasks/User Stories
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("feature"), // feature, bug, refactor, documentation, test, chore
  status: text("status").notNull().default("backlog"), // backlog, todo, in-progress, review, done, blocked
  priority: text("priority").default("medium"), // low, medium, high, critical
  assigneeId: text("assignee_id").references(() => users.id),
  reporterId: text("reporter_id").references(() => users.id),
  storyPoints: integer("story_points"),
  estimatedHours: decimal("estimated_hours"),
  actualHours: decimal("actual_hours"),
  labels: json("labels").$type<string[]>().default([]),
  dependencies: json("dependencies").$type<number[]>().default([]), // Task IDs this depends on
  blockedBy: json("blocked_by").$type<number[]>().default([]), // Task IDs blocking this
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Issues/Bugs (transformed from vulnerabilities)
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("bug"), // bug, enhancement, task, question
  severity: text("severity").notNull().default("medium"), // critical, high, medium, low
  status: text("status").notNull().default("new"), // new, assigned, in-progress, resolved, closed, reopened
  assigneeId: text("assignee_id").references(() => users.id),
  reporterId: text("reporter_id").references(() => users.id),
  storyPoints: integer("story_points"),
  estimatedHours: decimal("estimated_hours"),
  labels: json("labels").$type<string[]>().default([]),
  relatedTaskId: integer("related_task_id").references(() => tasks.id),
  environmentId: integer("environment_id").references(() => environments.id),
  reproductionSteps: text("reproduction_steps"),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  attachments: json("attachments").$type<string[]>().default([]),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiAgents = pgTable("ai_agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // ARCHITECTURE_LEAD, FRONTEND_CORE, BACKEND_INTEGRATION, QUALITY_ASSURANCE, DEVOPS, MCP_INTEGRATION
  endpoint: text("endpoint"),
  apiKey: text("api_key"),
  modelPrompt: text("model_prompt"),
  flowOrder: integer("flow_order").default(0),
  status: text("status").notNull().default("OFFLINE"), // INITIALIZING, READY, BUSY, BLOCKED, ERROR, OFFLINE
  lastPing: timestamp("last_ping"),
  config: json("config").$type<Record<string, any>>().default({}),
  // Health and Metrics
  cpuUsage: decimal("cpu_usage"),
  memoryUsage: decimal("memory_usage"),
  uptime: integer("uptime"), // in seconds
  tasksCompleted: integer("tasks_completed").default(0),
  tasksFailed: integer("tasks_failed").default(0),
  averageResponseTime: decimal("average_response_time"), // in ms
  // Task Management
  currentTaskId: text("current_task_id"),
  currentTaskProgress: integer("current_task_progress"), // percentage
  taskQueue: json("task_queue").$type<string[]>().default([]),
  capabilities: json("capabilities").$type<string[]>().default([]),
  // Loop configuration
  loopEnabled: boolean("loop_enabled").default(false),
  loopPartnerId: integer("loop_partner_id"),
  maxLoopIterations: integer("max_loop_iterations").default(5),
  loopExitCondition: text("loop_exit_condition"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Git Repositories
export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  provider: text("provider").notNull(), // github, gitlab, bitbucket
  defaultBranch: text("default_branch").default("main"),
  lastCommitSha: text("last_commit_sha"),
  lastCommitMessage: text("last_commit_message"),
  lastCommitAuthor: text("last_commit_author"),
  lastSync: timestamp("last_sync"),
  webhooksConfigured: boolean("webhooks_configured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Deployments
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  environmentId: integer("environment_id").references(() => environments.id).notNull(),
  version: text("version").notNull(),
  status: text("status").notNull().default("pending"), // pending, deploying, success, failed, rolled-back
  deployedById: text("deployed_by_id").references(() => users.id),
  gitCommitSha: text("git_commit_sha"),
  deploymentLog: text("deployment_log"),
  rollbackAvailable: boolean("rollback_available").default(true),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pull Requests
export const pullRequests = pgTable("pull_requests", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").references(() => repositories.id).notNull(),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  authorId: text("author_id").references(() => users.id),
  status: text("status").notNull().default("open"), // open, merged, closed
  sourceBranch: text("source_branch").notNull(),
  targetBranch: text("target_branch").notNull(),
  reviewers: json("reviewers").$type<string[]>().default([]),
  approvedBy: json("approved_by").$type<string[]>().default([]),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  mergedAt: timestamp("merged_at"),
  closedAt: timestamp("closed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Software Releases
export const releases = pgTable("releases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  version: text("version").notNull(),
  title: text("title").notNull(),
  releaseNotes: text("release_notes"),
  changelog: text("changelog"),
  gitTag: text("git_tag"),
  deploymentStatus: text("deployment_status").default("pending"), // pending, deploying, deployed, failed
  breakingChanges: json("breaking_changes").$type<string[]>().default([]),
  migrationGuide: text("migration_guide"),
  aiGenerated: boolean("ai_generated").default(false),
  releaseDate: timestamp("release_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Global configuration table
export const globalConfig = pgTable("global_config", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  configType: text("config_type").notNull(), // 'profile', 'api', 'notifications', etc.
  configData: json("config_data").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for SDLC entities
export const projectsRelations = relations(projects, ({ many }) => ({
  environments: many(environments),
  sprints: many(sprints),
  tasks: many(tasks),
  issues: many(issues),
  repositories: many(repositories),
  deployments: many(deployments),
  releases: many(releases),
}));

export const environmentsRelations = relations(environments, ({ one, many }) => ({
  project: one(projects, {
    fields: [environments.projectId],
    references: [projects.id],
  }),
  deployments: many(deployments),
  issues: many(issues),
}));

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
  issues: many(issues),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  sprint: one(sprints, {
    fields: [tasks.sprintId],
    references: [sprints.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  reporter: one(users, {
    fields: [tasks.reporterId],
    references: [users.id],
  }),
  relatedIssues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  project: one(projects, {
    fields: [issues.projectId],
    references: [projects.id],
  }),
  sprint: one(sprints, {
    fields: [issues.sprintId],
    references: [sprints.id],
  }),
  assignee: one(users, {
    fields: [issues.assigneeId],
    references: [users.id],
  }),
  reporter: one(users, {
    fields: [issues.reporterId],
    references: [users.id],
  }),
  relatedTask: one(tasks, {
    fields: [issues.relatedTaskId],
    references: [tasks.id],
  }),
  environment: one(environments, {
    fields: [issues.environmentId],
    references: [environments.id],
  }),
}));

export const repositoriesRelations = relations(repositories, ({ one, many }) => ({
  project: one(projects, {
    fields: [repositories.projectId],
    references: [projects.id],
  }),
  pullRequests: many(pullRequests),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  project: one(projects, {
    fields: [deployments.projectId],
    references: [projects.id],
  }),
  environment: one(environments, {
    fields: [deployments.environmentId],
    references: [environments.id],
  }),
  deployedBy: one(users, {
    fields: [deployments.deployedById],
    references: [users.id],
  }),
}));

export const pullRequestsRelations = relations(pullRequests, ({ one }) => ({
  repository: one(repositories, {
    fields: [pullRequests.repositoryId],
    references: [repositories.id],
  }),
  author: one(users, {
    fields: [pullRequests.authorId],
    references: [users.id],
  }),
}));

export const releasesRelations = relations(releases, ({ one }) => ({
  project: one(projects, {
    fields: [releases.projectId],
    references: [projects.id],
  }),
}));

export const aiAgentsRelations = relations(aiAgents, ({ one }) => ({
  loopPartner: one(aiAgents, {
    fields: [aiAgents.loopPartnerId],
    references: [aiAgents.id],
  }),
}));

// Insert schemas for SDLC tables with date coercion
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const upsertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  targetReleaseDate: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  actualReleaseDate: z.coerce.date().optional().nullable(),
});

export const insertEnvironmentSchema = createInsertSchema(environments).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  lastDeployment: z.coerce.date().optional().nullable(),
  lastHealthCheck: z.coerce.date().optional().nullable(),
});

export const insertSprintSchema = createInsertSchema(sprints).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  dueDate: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
});

export const insertIssueSchema = createInsertSchema(issues).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  resolvedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
});

export const insertRepositorySchema = createInsertSchema(repositories).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  lastSync: z.coerce.date().optional().nullable(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({ id: true, createdAt: true }).extend({
  startedAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
});

export const insertPullRequestSchema = createInsertSchema(pullRequests).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  mergedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
});

export const insertReleaseSchema = createInsertSchema(releases).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  releaseDate: z.coerce.date().optional().nullable(),
});

export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  lastPing: z.coerce.date().optional().nullable(),
});

export const insertGlobalConfigSchema = createInsertSchema(globalConfig).omit({ id: true, createdAt: true, updatedAt: true });

// Types for SDLC tables
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertEnvironment = z.infer<typeof insertEnvironmentSchema>;
export type Environment = typeof environments.$inferSelect;
export type InsertSprint = z.infer<typeof insertSprintSchema>;
export type Sprint = typeof sprints.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;
export type InsertPullRequest = z.infer<typeof insertPullRequestSchema>;
export type PullRequest = typeof pullRequests.$inferSelect;
export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Release = typeof releases.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;
export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertGlobalConfig = z.infer<typeof insertGlobalConfigSchema>;
export type GlobalConfig = typeof globalConfig.$inferSelect;

// Legacy type aliases for backward compatibility during migration
export type Program = Project;
export type InsertProgram = InsertProject;
export type Vulnerability = Issue;
export type InsertVulnerability = InsertIssue;
