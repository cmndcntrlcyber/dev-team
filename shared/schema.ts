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

// Red Team Operations
export const operations = pgTable("operations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  codename: text("codename"),
  status: text("status").notNull().default("planning"), // planning, active, paused, completed
  type: text("type").notNull(), // penetration-test, red-team, purple-team, assumed-breach
  description: text("description"),
  priority: text("priority").default("medium"), // low, medium, high, critical
  tags: json("tags").$type<string[]>().default([]),
  objectives: json("objectives").$type<string[]>().default([]), // Operation objectives
  scope: json("scope").$type<string[]>().default([]), // IP ranges, domains, etc.
  rulesOfEngagement: text("rules_of_engagement"), // ROE documentation
  clientContact: text("client_contact"),
  teamLead: text("team_lead"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"), // Internal notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Compromised Systems/Hosts
export const systems = pgTable("systems", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").references(() => operations.id).notNull(),
  hostname: text("hostname"),
  ipAddress: text("ip_address").notNull(),
  operatingSystem: text("operating_system"),
  status: text("status").notNull().default("discovered"), // discovered, scanned, compromised, pivoted
  accessLevel: text("access_level"), // none, user, admin, system, domain-admin
  tags: json("tags").$type<string[]>().default([]),
  services: json("services").$type<any[]>().default([]), // Running services
  notes: text("notes"),
  lastSeen: timestamp("last_seen").defaultNow(),
  compromisedAt: timestamp("compromised_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// C2 Beacons
export const beacons = pgTable("beacons", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").references(() => operations.id).notNull(),
  systemId: integer("system_id").references(() => systems.id),
  beaconId: text("beacon_id").notNull().unique(), // Unique beacon identifier
  type: text("type").notNull(), // cobalt-strike, metasploit, empire, custom
  status: text("status").notNull().default("active"), // active, sleeping, dead, lost
  hostname: text("hostname"),
  username: text("username"),
  pid: integer("pid"),
  architecture: text("architecture"), // x86, x64
  integrity: text("integrity"), // low, medium, high, system
  lastCheckin: timestamp("last_checkin").defaultNow(),
  sleepTime: integer("sleep_time"), // in seconds
  jitter: integer("jitter"), // percentage
  externalIp: text("external_ip"),
  internalIp: text("internal_ip"),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Network Discovery Results
export const networkDiscoveries = pgTable("network_discoveries", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").references(() => operations.id).notNull(),
  systemId: integer("system_id").references(() => systems.id),
  type: text("type").notNull(), // arp-scan, port-scan, service-scan, vulnerability-scan
  target: text("target").notNull(), // IP, range, or hostname
  results: json("results").$type<any>().notNull(),
  toolUsed: text("tool_used"), // nmap, masscan, arp-scan, etc.
  commandLine: text("command_line"),
  scanDuration: integer("scan_duration"), // in seconds
  discoveredHosts: integer("discovered_hosts").default(0),
  discoveredServices: integer("discovered_services").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Remote Desktop Sessions (RustDesk)
export const remoteSessions = pgTable("remote_sessions", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").references(() => operations.id).notNull(),
  systemId: integer("system_id").references(() => systems.id).notNull(),
  sessionType: text("session_type").notNull(), // rustdesk, rdp, vnc, ssh
  connectionId: text("connection_id").notNull(),
  status: text("status").notNull().default("inactive"), // active, inactive, connecting
  remoteAddress: text("remote_address"),
  remotePort: integer("remote_port"),
  rustdeskId: text("rustdesk_id"), // RustDesk ID
  rustdeskPassword: text("rustdesk_password"), // Encrypted
  notes: text("notes"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiAgents = pgTable("ai_agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // openai, anthropic, local, burp
  endpoint: text("endpoint"),
  apiKey: text("api_key"),
  modelPrompt: text("model_prompt"),
  flowOrder: integer("flow_order").default(0),
  status: text("status").notNull().default("offline"), // online, offline, error
  lastPing: timestamp("last_ping"),
  config: json("config").$type<Record<string, any>>().default({}),
  // Loop configuration
  loopEnabled: boolean("loop_enabled").default(false),
  loopPartnerId: integer("loop_partner_id"),
  maxLoopIterations: integer("max_loop_iterations").default(5),
  loopExitCondition: text("loop_exit_condition"), // 'functional_poc', 'vulnerability_confirmed', 'exploit_successful'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Operation Reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").references(() => operations.id).notNull(),
  type: text("type").notNull(), // initial-access, lateral-movement, persistence, exfiltration, post-exploitation
  title: text("title").notNull(),
  content: text("content").notNull(),
  format: text("format").notNull().default("markdown"), // markdown, html, json
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientCertificates = pgTable("client_certificates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  certificateFile: text("certificate_file").notNull(), // path to .crt/.pem file
  privateKeyFile: text("private_key_file").notNull(), // path to .key file
  caFile: text("ca_file"), // optional CA certificate file
  passphrase: text("passphrase"), // encrypted passphrase for private key
  domain: text("domain"), // target domain/scope
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
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

// Programs table (for Bug Bounty programs)
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // bug-bounty, private, internal
  platform: text("platform"), // hackerone, bugcrowd, synack, etc.
  url: text("url"),
  description: text("description"),
  status: text("status").notNull().default("active"), // active, inactive, paused
  codename: text("codename"),
  priority: text("priority").default("medium"), // low, medium, high, critical
  tags: json("tags").$type<string[]>().default([]),
  scope: json("scope").$type<string[]>().default([]),
  objectives: json("objectives").$type<string[]>().default([]),
  rulesOfEngagement: text("rules_of_engagement"),
  clientContact: text("client_contact"),
  teamLead: text("team_lead"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  minReward: integer("min_reward"),
  maxReward: integer("max_reward"),
  vulnerabilityTypes: json("vulnerability_types").$type<string[]>().default([]),
  notes: text("notes"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Vulnerabilities table
export const vulnerabilities = pgTable("vulnerabilities", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => programs.id),
  operationId: integer("operation_id").references(() => operations.id).notNull(),
  beaconId: text("beacon_id").notNull(),
  type: text("type").notNull(), // xss, sqli, rce, etc.
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull(), // P1, P2, P3, P4
  status: text("status").notNull().default("new"), // new, triaged, resolved
  proofOfConcept: text("proof_of_concept"),
  recommendations: text("recommendations"),
  cvssScore: decimal("cvss_score"),
  reward: integer("reward"),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  integrity: text("integrity"),
  username: text("username"),
  hostname: text("hostname"),
  systemId: integer("system_id").references(() => systems.id),
  pid: integer("pid"),
  architecture: text("architecture"),
  lastCheckin: timestamp("last_checkin"),
  sleepTime: integer("sleep_time"),
  jitter: integer("jitter"),
  attachments: json("attachments").$type<File[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
// Relations for Red Team entities
export const operationsRelations = relations(operations, ({ many }) => ({
  systems: many(systems),
  beacons: many(beacons),
  networkDiscoveries: many(networkDiscoveries),
  remoteSessions: many(remoteSessions),
  reports: many(reports),
}));

export const systemsRelations = relations(systems, ({ one, many }) => ({
  operation: one(operations, {
    fields: [systems.operationId],
    references: [operations.id],
  }),
  beacons: many(beacons),
  networkDiscoveries: many(networkDiscoveries),
  remoteSessions: many(remoteSessions),
}));

export const beaconsRelations = relations(beacons, ({ one }) => ({
  operation: one(operations, {
    fields: [beacons.operationId],
    references: [operations.id],
  }),
  system: one(systems, {
    fields: [beacons.systemId],
    references: [systems.id],
  }),
}));

export const networkDiscoveriesRelations = relations(networkDiscoveries, ({ one }) => ({
  operation: one(operations, {
    fields: [networkDiscoveries.operationId],
    references: [operations.id],
  }),
  system: one(systems, {
    fields: [networkDiscoveries.systemId],
    references: [systems.id],
  }),
}));

export const remoteSessionsRelations = relations(remoteSessions, ({ one }) => ({
  operation: one(operations, {
    fields: [remoteSessions.operationId],
    references: [operations.id],
  }),
  system: one(systems, {
    fields: [remoteSessions.systemId],
    references: [systems.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  operation: one(operations, {
    fields: [reports.operationId],
    references: [operations.id],
  }),
}));

export const aiAgentsRelations = relations(aiAgents, ({ one }) => ({
  loopPartner: one(aiAgents, {
    fields: [aiAgents.loopPartnerId],
    references: [aiAgents.id],
  }),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  vulnerabilities: many(vulnerabilities),
}));

export const vulnerabilitiesRelations = relations(vulnerabilities, ({ one }) => ({
  program: one(programs, {
    fields: [vulnerabilities.programId],
    references: [programs.id],
  }),
  operation: one(operations, {
    fields: [vulnerabilities.operationId],
    references: [operations.id],
  }),
  system: one(systems, {
    fields: [vulnerabilities.systemId],
    references: [systems.id],
  }),
}));

// Insert schemas
// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const upsertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertOperationSchema = createInsertSchema(operations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSystemSchema = createInsertSchema(systems).omit({ id: true, createdAt: true });
export const insertBeaconSchema = createInsertSchema(beacons).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNetworkDiscoverySchema = createInsertSchema(networkDiscoveries).omit({ id: true, createdAt: true });
export const insertRemoteSessionSchema = createInsertSchema(remoteSessions).omit({ id: true, createdAt: true });
export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });
export const insertClientCertificateSchema = createInsertSchema(clientCertificates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGlobalConfigSchema = createInsertSchema(globalConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProgramSchema = createInsertSchema(programs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOperation = z.infer<typeof insertOperationSchema>;
export type Operation = typeof operations.$inferSelect;
export type InsertSystem = z.infer<typeof insertSystemSchema>;
export type System = typeof systems.$inferSelect;
export type InsertBeacon = z.infer<typeof insertBeaconSchema>;
export type Beacon = typeof beacons.$inferSelect;
export type InsertNetworkDiscovery = z.infer<typeof insertNetworkDiscoverySchema>;
export type NetworkDiscovery = typeof networkDiscoveries.$inferSelect;
export type InsertRemoteSession = z.infer<typeof insertRemoteSessionSchema>;
export type RemoteSession = typeof remoteSessions.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;
export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertClientCertificate = z.infer<typeof insertClientCertificateSchema>;
export type ClientCertificate = typeof clientCertificates.$inferSelect;
export type InsertGlobalConfig = z.infer<typeof insertGlobalConfigSchema>;
export type GlobalConfig = typeof globalConfig.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type Vulnerability = typeof vulnerabilities.$inferSelect;
