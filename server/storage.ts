import {
  users,
  projects,
  environments,
  sprints,
  tasks,
  issues,
  repositories,
  deployments,
  pullRequests,
  releases,
  aiAgents,
  globalConfig,
  type User,
  type InsertUser,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Environment,
  type InsertEnvironment,
  type Sprint,
  type InsertSprint,
  type Task,
  type InsertTask,
  type Issue,
  type InsertIssue,
  type Repository,
  type InsertRepository,
  type Deployment,
  type InsertDeployment,
  type PullRequest,
  type InsertPullRequest,
  type Release,
  type InsertRelease,
  type AiAgent,
  type InsertAiAgent,
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

  // Project operations
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Environment operations
  getEnvironments(projectId?: number): Promise<Environment[]>;
  getEnvironment(id: number): Promise<Environment | undefined>;
  createEnvironment(env: InsertEnvironment): Promise<Environment>;
  updateEnvironment(id: number, env: Partial<InsertEnvironment>): Promise<Environment>;
  deleteEnvironment(id: number): Promise<void>;

  // Sprint operations
  getSprints(projectId?: number): Promise<Sprint[]>;
  getSprint(id: number): Promise<Sprint | undefined>;
  getActiveSprint(projectId: number): Promise<Sprint | undefined>;
  createSprint(sprint: InsertSprint): Promise<Sprint>;
  updateSprint(id: number, sprint: Partial<InsertSprint>): Promise<Sprint>;
  deleteSprint(id: number): Promise<void>;

  // Task operations
  getTasks(filters?: { projectId?: number; sprintId?: number; status?: string }): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Issue operations
  getIssues(filters?: { projectId?: number; severity?: string; status?: string }): Promise<Issue[]>;
  getIssue(id: number): Promise<Issue | undefined>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, issue: Partial<InsertIssue>): Promise<Issue>;
  deleteIssue(id: number): Promise<void>;

  // Repository operations
  getRepositories(projectId?: number): Promise<Repository[]>;
  getRepository(id: number): Promise<Repository | undefined>;
  createRepository(repo: InsertRepository): Promise<Repository>;
  updateRepository(id: number, repo: Partial<InsertRepository>): Promise<Repository>;
  deleteRepository(id: number): Promise<void>;

  // Deployment operations
  getDeployments(filters?: { projectId?: number; environmentId?: number }): Promise<Deployment[]>;
  getDeployment(id: number): Promise<Deployment | undefined>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: number, deployment: Partial<InsertDeployment>): Promise<Deployment>;

  // Pull Request operations
  getPullRequests(repositoryId?: number): Promise<PullRequest[]>;
  getPullRequest(id: number): Promise<PullRequest | undefined>;
  createPullRequest(pr: InsertPullRequest): Promise<PullRequest>;
  updatePullRequest(id: number, pr: Partial<InsertPullRequest>): Promise<PullRequest>;

  // Release operations
  getReleases(projectId?: number): Promise<Release[]>;
  getRelease(id: number): Promise<Release | undefined>;
  createRelease(release: InsertRelease): Promise<Release>;
  updateRelease(id: number, release: Partial<InsertRelease>): Promise<Release>;

  // AI Agent operations
  getAiAgents(): Promise<AiAgent[]>;
  getAiAgent(id: number): Promise<AiAgent | undefined>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: number, agent: Partial<InsertAiAgent>): Promise<AiAgent>;
  deleteAiAgent(id: number): Promise<void>;

  // Analytics operations
  getDashboardStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    totalIssues: number;
    resolvedIssues: number;
    totalDeployments: number;
    successfulDeployments: number;
    tasksByStatus: { status: string; count: number }[];
    issuesBySeverity: { severity: string; count: number }[];
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

  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: number, updateProject: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...updateProject, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Environment operations
  async getEnvironments(projectId?: number): Promise<Environment[]> {
    if (projectId) {
      return await db.select().from(environments).where(eq(environments.projectId, projectId));
    }
    return await db.select().from(environments).orderBy(desc(environments.createdAt));
  }

  async getEnvironment(id: number): Promise<Environment | undefined> {
    const [environment] = await db.select().from(environments).where(eq(environments.id, id));
    return environment || undefined;
  }

  async createEnvironment(insertEnv: InsertEnvironment): Promise<Environment> {
    const [environment] = await db
      .insert(environments)
      .values(insertEnv)
      .returning();
    return environment;
  }

  async updateEnvironment(id: number, updateEnv: Partial<InsertEnvironment>): Promise<Environment> {
    const [environment] = await db
      .update(environments)
      .set({ ...updateEnv, updatedAt: new Date() })
      .where(eq(environments.id, id))
      .returning();
    return environment;
  }

  async deleteEnvironment(id: number): Promise<void> {
    await db.delete(environments).where(eq(environments.id, id));
  }

  // Sprint operations
  async getSprints(projectId?: number): Promise<Sprint[]> {
    if (projectId) {
      return await db.select().from(sprints).where(eq(sprints.projectId, projectId)).orderBy(desc(sprints.sprintNumber));
    }
    return await db.select().from(sprints).orderBy(desc(sprints.createdAt));
  }

  async getSprint(id: number): Promise<Sprint | undefined> {
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
    return sprint || undefined;
  }

  async getActiveSprint(projectId: number): Promise<Sprint | undefined> {
    const [sprint] = await db.select().from(sprints)
      .where(and(eq(sprints.projectId, projectId), eq(sprints.status, "active")))
      .limit(1);
    return sprint || undefined;
  }

  async createSprint(insertSprint: InsertSprint): Promise<Sprint> {
    const [sprint] = await db
      .insert(sprints)
      .values(insertSprint)
      .returning();
    return sprint;
  }

  async updateSprint(id: number, updateSprint: Partial<InsertSprint>): Promise<Sprint> {
    const [sprint] = await db
      .update(sprints)
      .set({ ...updateSprint, updatedAt: new Date() })
      .where(eq(sprints.id, id))
      .returning();
    return sprint;
  }

  async deleteSprint(id: number): Promise<void> {
    await db.delete(sprints).where(eq(sprints.id, id));
  }

  // Task operations
  async getTasks(filters?: { projectId?: number; sprintId?: number; status?: string }): Promise<Task[]> {
    let query = db.select().from(tasks);
    
    if (filters?.projectId) {
      query = query.where(eq(tasks.projectId, filters.projectId)) as any;
    }
    if (filters?.sprintId) {
      query = query.where(eq(tasks.sprintId, filters.sprintId)) as any;
    }
    if (filters?.status) {
      query = query.where(eq(tasks.status, filters.status)) as any;
    }
    
    return await query.orderBy(desc(tasks.createdAt)) as any;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateTask(id: number, updateTask: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...updateTask, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Issue operations
  async getIssues(filters?: { projectId?: number; severity?: string; status?: string }): Promise<Issue[]> {
    let query = db.select().from(issues);
    
    if (filters?.projectId) {
      query = query.where(eq(issues.projectId, filters.projectId)) as any;
    }
    if (filters?.severity) {
      query = query.where(eq(issues.severity, filters.severity)) as any;
    }
    if (filters?.status) {
      query = query.where(eq(issues.status, filters.status)) as any;
    }
    
    return await query.orderBy(desc(issues.createdAt)) as any;
  }

  async getIssue(id: number): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue || undefined;
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const [issue] = await db
      .insert(issues)
      .values(insertIssue)
      .returning();
    return issue;
  }

  async updateIssue(id: number, updateIssue: Partial<InsertIssue>): Promise<Issue> {
    const [issue] = await db
      .update(issues)
      .set({ ...updateIssue, updatedAt: new Date() })
      .where(eq(issues.id, id))
      .returning();
    return issue;
  }

  async deleteIssue(id: number): Promise<void> {
    await db.delete(issues).where(eq(issues.id, id));
  }

  // Repository operations
  async getRepositories(projectId?: number): Promise<Repository[]> {
    if (projectId) {
      return await db.select().from(repositories).where(eq(repositories.projectId, projectId));
    }
    return await db.select().from(repositories).orderBy(desc(repositories.createdAt));
  }

  async getRepository(id: number): Promise<Repository | undefined> {
    const [repo] = await db.select().from(repositories).where(eq(repositories.id, id));
    return repo || undefined;
  }

  async createRepository(insertRepo: InsertRepository): Promise<Repository> {
    const [repo] = await db
      .insert(repositories)
      .values(insertRepo)
      .returning();
    return repo;
  }

  async updateRepository(id: number, updateRepo: Partial<InsertRepository>): Promise<Repository> {
    const [repo] = await db
      .update(repositories)
      .set({ ...updateRepo, updatedAt: new Date() })
      .where(eq(repositories.id, id))
      .returning();
    return repo;
  }

  async deleteRepository(id: number): Promise<void> {
    await db.delete(repositories).where(eq(repositories.id, id));
  }

  // Deployment operations
  async getDeployments(filters?: { projectId?: number; environmentId?: number }): Promise<Deployment[]> {
    let query = db.select().from(deployments);
    
    if (filters?.projectId) {
      query = query.where(eq(deployments.projectId, filters.projectId)) as any;
    }
    if (filters?.environmentId) {
      query = query.where(eq(deployments.environmentId, filters.environmentId)) as any;
    }
    
    return await query.orderBy(desc(deployments.createdAt)) as any;
  }

  async getDeployment(id: number): Promise<Deployment | undefined> {
    const [deployment] = await db.select().from(deployments).where(eq(deployments.id, id));
    return deployment || undefined;
  }

  async createDeployment(insertDeployment: InsertDeployment): Promise<Deployment> {
    const [deployment] = await db
      .insert(deployments)
      .values(insertDeployment)
      .returning();
    return deployment;
  }

  async updateDeployment(id: number, updateDeployment: Partial<InsertDeployment>): Promise<Deployment> {
    const [deployment] = await db
      .update(deployments)
      .set(updateDeployment)
      .where(eq(deployments.id, id))
      .returning();
    return deployment;
  }

  // Pull Request operations
  async getPullRequests(repositoryId?: number): Promise<PullRequest[]> {
    if (repositoryId) {
      return await db.select().from(pullRequests).where(eq(pullRequests.repositoryId, repositoryId));
    }
    return await db.select().from(pullRequests).orderBy(desc(pullRequests.createdAt));
  }

  async getPullRequest(id: number): Promise<PullRequest | undefined> {
    const [pr] = await db.select().from(pullRequests).where(eq(pullRequests.id, id));
    return pr || undefined;
  }

  async createPullRequest(insertPR: InsertPullRequest): Promise<PullRequest> {
    const [pr] = await db
      .insert(pullRequests)
      .values(insertPR)
      .returning();
    return pr;
  }

  async updatePullRequest(id: number, updatePR: Partial<InsertPullRequest>): Promise<PullRequest> {
    const [pr] = await db
      .update(pullRequests)
      .set({ ...updatePR, updatedAt: new Date() })
      .where(eq(pullRequests.id, id))
      .returning();
    return pr;
  }

  // Release operations
  async getReleases(projectId?: number): Promise<Release[]> {
    if (projectId) {
      return await db.select().from(releases).where(eq(releases.projectId, projectId));
    }
    return await db.select().from(releases).orderBy(desc(releases.createdAt));
  }

  async getRelease(id: number): Promise<Release | undefined> {
    const [release] = await db.select().from(releases).where(eq(releases.id, id));
    return release || undefined;
  }

  async createRelease(insertRelease: InsertRelease): Promise<Release> {
    const [release] = await db
      .insert(releases)
      .values(insertRelease)
      .returning();
    return release;
  }

  async updateRelease(id: number, updateRelease: Partial<InsertRelease>): Promise<Release> {
    const [release] = await db
      .update(releases)
      .set({ ...updateRelease, updatedAt: new Date() })
      .where(eq(releases.id, id))
      .returning();
    return release;
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
      .set({ ...updateAgent, updatedAt: new Date() })
      .where(eq(aiAgents.id, id))
      .returning();
    return agent;
  }

  async deleteAiAgent(id: number): Promise<void> {
    await db.delete(aiAgents).where(eq(aiAgents.id, id));
  }

  // Analytics operations - SDLC metrics
  async getDashboardStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    totalIssues: number;
    resolvedIssues: number;
    totalDeployments: number;
    successfulDeployments: number;
    tasksByStatus: { status: string; count: number }[];
    issuesBySeverity: { severity: string; count: number }[];
  }> {
    const [projectCount] = await db.select({ count: count() }).from(projects);
    const [activeProjectCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, "active"));
    
    const [taskCount] = await db.select({ count: count() }).from(tasks);
    const [completedTaskCount] = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.status, "done"));
    
    const [issueCount] = await db.select({ count: count() }).from(issues);
    const [resolvedIssueCount] = await db
      .select({ count: count() })
      .from(issues)
      .where(eq(issues.status, "resolved"));
    
    const [deploymentCount] = await db.select({ count: count() }).from(deployments);
    const [successfulDeploymentCount] = await db
      .select({ count: count() })
      .from(deployments)
      .where(eq(deployments.status, "success"));
    
    const tasksByStatus = await db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .groupBy(tasks.status);

    const issuesBySeverity = await db
      .select({
        severity: issues.severity,
        count: count(),
      })
      .from(issues)
      .groupBy(issues.severity);

    return {
      totalProjects: projectCount.count,
      activeProjects: activeProjectCount.count,
      totalTasks: taskCount.count,
      completedTasks: completedTaskCount.count,
      totalIssues: issueCount.count,
      resolvedIssues: resolvedIssueCount.count,
      totalDeployments: deploymentCount.count,
      successfulDeployments: successfulDeploymentCount.count,
      tasksByStatus: tasksByStatus.map(stat => ({
        status: stat.status || 'unknown',
        count: stat.count
      })),
      issuesBySeverity: issuesBySeverity.map(stat => ({
        severity: stat.severity || 'unknown',
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
