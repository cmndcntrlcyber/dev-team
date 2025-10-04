import {
  users,
  operations,
  systems,
  beacons,
  networkDiscoveries,
  remoteSessions,
  aiAgents,
  reports,
  clientCertificates,
  globalConfig,
  type User,
  type InsertUser,
  type UpsertUser,
  type Operation,
  type InsertOperation,
  type System,
  type InsertSystem,
  type Beacon,
  type InsertBeacon,
  type NetworkDiscovery,
  type InsertNetworkDiscovery,
  type RemoteSession,
  type InsertRemoteSession,
  type AiAgent,
  type InsertAiAgent,
  type Report,
  type InsertReport,
  type ClientCertificate,
  type InsertClientCertificate,
  type GlobalConfig,
  type InsertGlobalConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Operation operations
  getOperations(): Promise<Operation[]>;
  getOperation(id: number): Promise<Operation | undefined>;
  createOperation(operation: InsertOperation): Promise<Operation>;
  updateOperation(id: number, operation: Partial<InsertOperation>): Promise<Operation>;
  deleteOperation(id: number): Promise<void>;

  // System operations
  getSystems(operationId?: number): Promise<System[]>;
  getSystem(id: number): Promise<System | undefined>;
  createSystem(system: InsertSystem): Promise<System>;
  updateSystem(id: number, system: Partial<InsertSystem>): Promise<System>;
  deleteSystem(id: number): Promise<void>;

  // Beacon operations
  getBeacons(operationId?: number): Promise<Beacon[]>;
  getBeacon(id: number): Promise<Beacon | undefined>;
  createBeacon(beacon: InsertBeacon): Promise<Beacon>;
  updateBeacon(id: number, beacon: Partial<InsertBeacon>): Promise<Beacon>;
  deleteBeacon(id: number): Promise<void>;

  // Network Discovery operations
  getNetworkDiscoveries(operationId?: number): Promise<NetworkDiscovery[]>;
  getNetworkDiscovery(id: number): Promise<NetworkDiscovery | undefined>;
  createNetworkDiscovery(discovery: InsertNetworkDiscovery): Promise<NetworkDiscovery>;
  updateNetworkDiscovery(id: number, discovery: Partial<InsertNetworkDiscovery>): Promise<NetworkDiscovery>;
  deleteNetworkDiscovery(id: number): Promise<void>;

  // Remote Session operations
  getRemoteSessions(operationId?: number): Promise<RemoteSession[]>;
  getRemoteSession(id: number): Promise<RemoteSession | undefined>;
  createRemoteSession(session: InsertRemoteSession): Promise<RemoteSession>;
  updateRemoteSession(id: number, session: Partial<InsertRemoteSession>): Promise<RemoteSession>;
  deleteRemoteSession(id: number): Promise<void>;

  // AI Agent operations
  getAiAgents(): Promise<AiAgent[]>;
  getAiAgent(id: number): Promise<AiAgent | undefined>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: number, agent: Partial<InsertAiAgent>): Promise<AiAgent>;
  deleteAiAgent(id: number): Promise<void>;

  // Report operations
  getReports(operationId?: number): Promise<Report[]>;
  getReport(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, report: Partial<InsertReport>): Promise<Report>;
  deleteReport(id: number): Promise<void>;

  // Client Certificate operations
  getClientCertificates(): Promise<ClientCertificate[]>;
  getClientCertificate(id: number): Promise<ClientCertificate | undefined>;
  createClientCertificate(certificate: InsertClientCertificate): Promise<ClientCertificate>;
  updateClientCertificate(id: number, certificate: Partial<InsertClientCertificate>): Promise<ClientCertificate>;
  deleteClientCertificate(id: number): Promise<void>;

  // Analytics operations
  getDashboardStats(): Promise<{
    totalOperations: number;
    totalSystems: number;
    activeBeacons: number;
    completedOperations: number;
    systemsByAccessLevel: { level: string; count: number }[];
  }>;

  // Global Config operations
  getGlobalConfig(userId: string, configType: string): Promise<GlobalConfig | undefined>;
  saveGlobalConfig(config: InsertGlobalConfig): Promise<GlobalConfig>;
  getAllUserConfigs(userId: string): Promise<GlobalConfig[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Operation operations
  async getOperations(): Promise<Operation[]> {
    return await db.select().from(operations).orderBy(desc(operations.createdAt));
  }

  async getOperation(id: number): Promise<Operation | undefined> {
    const [operation] = await db.select().from(operations).where(eq(operations.id, id));
    return operation || undefined;
  }

  async createOperation(insertOperation: InsertOperation): Promise<Operation> {
    const [operation] = await db
      .insert(operations)
      .values(insertOperation)
      .returning();
    return operation;
  }

  async updateOperation(id: number, updateOperation: Partial<InsertOperation>): Promise<Operation> {
    const [operation] = await db
      .update(operations)
      .set({ ...updateOperation, updatedAt: new Date() })
      .where(eq(operations.id, id))
      .returning();
    return operation;
  }

  async deleteOperation(id: number): Promise<void> {
    await db.delete(operations).where(eq(operations.id, id));
  }

  // System operations
  async getSystems(operationId?: number): Promise<System[]> {
    if (operationId) {
      return await db.select().from(systems).where(eq(systems.operationId, operationId));
    }
    return await db.select().from(systems).orderBy(desc(systems.createdAt));
  }

  async getSystem(id: number): Promise<System | undefined> {
    const [system] = await db.select().from(systems).where(eq(systems.id, id));
    return system || undefined;
  }

  async createSystem(insertSystem: InsertSystem): Promise<System> {
    const [system] = await db
      .insert(systems)
      .values(insertSystem)
      .returning();
    return system;
  }

  async updateSystem(id: number, updateSystem: Partial<InsertSystem>): Promise<System> {
    const [system] = await db
      .update(systems)
      .set(updateSystem)
      .where(eq(systems.id, id))
      .returning();
    return system;
  }

  async deleteSystem(id: number): Promise<void> {
    await db.delete(systems).where(eq(systems.id, id));
  }

  // Beacon operations
  async getBeacons(operationId?: number): Promise<Beacon[]> {
    if (operationId) {
      return await db.select().from(beacons).where(eq(beacons.operationId, operationId));
    }
    return await db.select().from(beacons).orderBy(desc(beacons.createdAt));
  }

  async getBeacon(id: number): Promise<Beacon | undefined> {
    const [beacon] = await db.select().from(beacons).where(eq(beacons.id, id));
    return beacon || undefined;
  }

  async createBeacon(insertBeacon: InsertBeacon): Promise<Beacon> {
    const [beacon] = await db
      .insert(beacons)
      .values(insertBeacon)
      .returning();
    return beacon;
  }

  async updateBeacon(id: number, updateBeacon: Partial<InsertBeacon>): Promise<Beacon> {
    const [beacon] = await db
      .update(beacons)
      .set({ ...updateBeacon, updatedAt: new Date() })
      .where(eq(beacons.id, id))
      .returning();
    return beacon;
  }

  async deleteBeacon(id: number): Promise<void> {
    await db.delete(beacons).where(eq(beacons.id, id));
  }

  // Network Discovery operations
  async getNetworkDiscoveries(operationId?: number): Promise<NetworkDiscovery[]> {
    if (operationId) {
      return await db.select().from(networkDiscoveries).where(eq(networkDiscoveries.operationId, operationId));
    }
    return await db.select().from(networkDiscoveries).orderBy(desc(networkDiscoveries.createdAt));
  }

  async getNetworkDiscovery(id: number): Promise<NetworkDiscovery | undefined> {
    const [discovery] = await db.select().from(networkDiscoveries).where(eq(networkDiscoveries.id, id));
    return discovery || undefined;
  }

  async createNetworkDiscovery(insertDiscovery: InsertNetworkDiscovery): Promise<NetworkDiscovery> {
    const [discovery] = await db
      .insert(networkDiscoveries)
      .values(insertDiscovery)
      .returning();
    return discovery;
  }

  async updateNetworkDiscovery(id: number, updateDiscovery: Partial<InsertNetworkDiscovery>): Promise<NetworkDiscovery> {
    const [discovery] = await db
      .update(networkDiscoveries)
      .set(updateDiscovery)
      .where(eq(networkDiscoveries.id, id))
      .returning();
    return discovery;
  }

  async deleteNetworkDiscovery(id: number): Promise<void> {
    await db.delete(networkDiscoveries).where(eq(networkDiscoveries.id, id));
  }

  // Remote Session operations
  async getRemoteSessions(operationId?: number): Promise<RemoteSession[]> {
    if (operationId) {
      return await db.select().from(remoteSessions).where(eq(remoteSessions.operationId, operationId));
    }
    return await db.select().from(remoteSessions).orderBy(desc(remoteSessions.createdAt));
  }

  async getRemoteSession(id: number): Promise<RemoteSession | undefined> {
    const [session] = await db.select().from(remoteSessions).where(eq(remoteSessions.id, id));
    return session || undefined;
  }

  async createRemoteSession(insertSession: InsertRemoteSession): Promise<RemoteSession> {
    const [session] = await db
      .insert(remoteSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateRemoteSession(id: number, updateSession: Partial<InsertRemoteSession>): Promise<RemoteSession> {
    const [session] = await db
      .update(remoteSessions)
      .set(updateSession)
      .where(eq(remoteSessions.id, id))
      .returning();
    return session;
  }

  async deleteRemoteSession(id: number): Promise<void> {
    await db.delete(remoteSessions).where(eq(remoteSessions.id, id));
  }

  // AI Agent operations
  async getAiAgents(): Promise<AiAgent[]> {
    return await db.select().from(aiAgents).orderBy(desc(aiAgents.createdAt));
  }

  async getAiAgent(id: number): Promise<AiAgent | undefined> {
    const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, id));
    return agent || undefined;
  }

  async createAiAgent(insertAgent: InsertAiAgent): Promise<AiAgent> {
    const [agent] = await db
      .insert(aiAgents)
      .values(insertAgent)
      .returning();
    return agent;
  }

  async updateAiAgent(id: number, updateAgent: Partial<InsertAiAgent>): Promise<AiAgent> {
    const [agent] = await db
      .update(aiAgents)
      .set(updateAgent)
      .where(eq(aiAgents.id, id))
      .returning();
    return agent;
  }

  async deleteAiAgent(id: number): Promise<void> {
    await db.delete(aiAgents).where(eq(aiAgents.id, id));
  }

  // Report operations
  async getReports(operationId?: number): Promise<Report[]> {
    if (operationId) {
      return await db.select().from(reports).where(eq(reports.operationId, operationId));
    }
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report || undefined;
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db
      .insert(reports)
      .values(insertReport)
      .returning();
    return report;
  }

  async updateReport(id: number, updateReport: Partial<InsertReport>): Promise<Report> {
    const [report] = await db
      .update(reports)
      .set(updateReport)
      .where(eq(reports.id, id))
      .returning();
    return report;
  }

  async deleteReport(id: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  // Client Certificate operations
  async getClientCertificates(): Promise<ClientCertificate[]> {
    return await db.select().from(clientCertificates).orderBy(desc(clientCertificates.createdAt));
  }

  async getClientCertificate(id: number): Promise<ClientCertificate | undefined> {
    const [certificate] = await db.select().from(clientCertificates).where(eq(clientCertificates.id, id));
    return certificate || undefined;
  }

  async createClientCertificate(insertCertificate: InsertClientCertificate): Promise<ClientCertificate> {
    const [certificate] = await db
      .insert(clientCertificates)
      .values(insertCertificate)
      .returning();
    return certificate;
  }

  async updateClientCertificate(id: number, updateCertificate: Partial<InsertClientCertificate>): Promise<ClientCertificate> {
    const [certificate] = await db
      .update(clientCertificates)
      .set({ ...updateCertificate, updatedAt: new Date() })
      .where(eq(clientCertificates.id, id))
      .returning();
    return certificate;
  }

  async deleteClientCertificate(id: number): Promise<void> {
    await db.delete(clientCertificates).where(eq(clientCertificates.id, id));
  }

  // Analytics operations
  async getDashboardStats(): Promise<{
    totalOperations: number;
    totalSystems: number;
    activeBeacons: number;
    completedOperations: number;
    systemsByAccessLevel: { level: string; count: number }[];
  }> {
    const [operationCount] = await db.select({ count: count() }).from(operations);
    const [systemCount] = await db.select({ count: count() }).from(systems);
    
    const [beaconCount] = await db
      .select({ count: count() })
      .from(beacons)
      .where(eq(beacons.status, "active"));
    
    const [completedCount] = await db
      .select({ count: count() })
      .from(operations)
      .where(eq(operations.status, "completed"));
    
    const systemsByAccessLevel = await db
      .select({
        level: systems.accessLevel,
        count: count(),
      })
      .from(systems)
      .where(eq(systems.accessLevel, systems.accessLevel))
      .groupBy(systems.accessLevel);

    return {
      totalOperations: operationCount.count,
      totalSystems: systemCount.count,
      activeBeacons: beaconCount.count,
      completedOperations: completedCount.count,
      systemsByAccessLevel: systemsByAccessLevel.map(stat => ({
        level: stat.level || 'unknown',
        count: stat.count
      }))
    };
  }

  // Global Config operations
  async getGlobalConfig(userId: string, configType: string): Promise<GlobalConfig | undefined> {
    const [config] = await db
      .select()
      .from(globalConfig)
      .where(and(eq(globalConfig.userId, userId), eq(globalConfig.configType, configType)));
    return config || undefined;
  }

  async saveGlobalConfig(config: InsertGlobalConfig): Promise<GlobalConfig> {
    // Check if config already exists
    const existing = await this.getGlobalConfig(config.userId, config.configType);
    
    if (existing) {
      // Update existing config
      const [updatedConfig] = await db
        .update(globalConfig)
        .set({ 
          configData: config.configData,
          updatedAt: new Date() 
        })
        .where(and(eq(globalConfig.userId, config.userId), eq(globalConfig.configType, config.configType)))
        .returning();
      return updatedConfig;
    } else {
      // Create new config
      const [newConfig] = await db
        .insert(globalConfig)
        .values(config)
        .returning();
      return newConfig;
    }
  }

  async getAllUserConfigs(userId: string): Promise<GlobalConfig[]> {
    return await db
      .select()
      .from(globalConfig)
      .where(eq(globalConfig.userId, userId))
      .orderBy(desc(globalConfig.updatedAt));
  }
}

export const storage = new DatabaseStorage();
