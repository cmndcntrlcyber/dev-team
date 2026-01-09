# Implementation Plan: Remove Mock Data and Fix Persistence

**Created**: 2025-12-17
**Status**: Planned
**Methodology**: Baby Steps™

---

## Executive Summary

This plan addresses the removal of hardcoded mock data and implementation of real database persistence across the dev-team-platform. The strategy prioritizes **backend-first** development to ensure stable APIs before updating frontend consumers.

---

## Problem Statement

### Mock Data Locations (6 locations)

| File | Lines | Description |
|------|-------|-------------|
| `frontend/src/hooks/useTasks.ts` | 31-86 | `mockTasks` array with 5 hardcoded tasks |
| `frontend/src/hooks/useProjects.ts` | 18-49 | `mockProjects` array with 3 hardcoded projects |
| `frontend/src/hooks/useAgents.ts` | 19-98 | `mockAgents` array with 6 hardcoded agents |
| `frontend/src/app/page.tsx` | 26-118 | Duplicate `agentData` in `fetchAgentData()` |
| `frontend/src/components/tasks/TaskSubmissionForm.tsx` | 34-41 | Hardcoded `agents` dropdown list |
| `frontend/src/app/settings/page.tsx` | 12-49 | Hardcoded `settingSections` (static UI labels) |

### Persistence Failures (7 locations)

| File | Issue |
|------|-------|
| `services/project-service/src/controllers/ProjectController.ts:54-92` | `createProject`, `updateProject`, `deleteProject` are stubs |
| `services/task-service/src/index.ts:124-130` | POST /tasks generates UUID but doesn't persist |
| `services/auth-service/src/services/AuthService.ts:301-302` | `generateJWT` returns mock token |
| `frontend/src/hooks/useAgents.ts:164-177` | `useUpdateAgentOrder` only updates local cache |
| `frontend/src/app/page.tsx:139-156` | Agent drag-drop order only in local state |
| `frontend/src/app/settings/page.tsx:373-380` | Save/Cancel buttons have no handlers |
| `frontend/src/components/tasks/TaskSubmissionForm.tsx:59-62` | Form calls `onSubmit` but no API call |

---

## Implementation Strategy

### Approach: Backend-First

1. Fix backend services first because frontend mocks exist *because* APIs don't work reliably
2. Removing frontend mocks without working APIs breaks the UI completely
3. Backend changes are isolated and testable independently

### Dependency Graph

```
Database Schema Verification
          │
          ▼
    ┌─────┴─────┐
    │           │
    ▼           ▼
Project     Task        Auth Service
Service     Service     (JWT)
    │           │           │
    └─────┬─────┘           │
          │                 │
          ▼                 ▼
    Frontend Hooks ◄────────┘
    (useProjects, useTasks, useAgents)
          │
          ▼
    Page Components
    (page.tsx, TaskSubmissionForm)
          │
          ▼
    State Features
    (Agent ordering, Settings)
```

---

## Baby Steps™ Implementation Plan

### Phase 1: Backend Database Persistence (Foundation Layer)

#### Step 1: Verify Database Schema and Connectivity

**What**: Confirm that database tables exist and services can connect
**Why**: Foundation must be solid before building persistence logic

**Validation Criteria**:
- [ ] Database container is running
- [ ] All tables from `02-create-tables.sql` exist
- [ ] Project service can query database successfully
- [ ] Task service can query database successfully

**Commands**:
```bash
cd /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform
docker-compose ps postgres
docker-compose exec postgres psql -U devteam -d devteam_db -c "\dt"
```

---

#### Step 2: Implement ProjectController.createProject()

**What**: Replace stub with real database INSERT for creating projects
**Why**: Projects are the parent entity that tasks depend on
**File**: `services/project-service/src/controllers/ProjectController.ts`

**Changes**:
- Extract request body (name, description, status, owner_id)
- Validate required fields
- Generate UUID for project ID
- Insert into `projects` table
- Return created project with all fields

**Implementation**:
```typescript
async createProject(request: FastifyRequest, reply: FastifyReply) {
  const { name, description, type, repository } = request.body as {
    name: string;
    description?: string;
    type?: string;
    repository?: string;
  };

  if (!name) {
    return reply.code(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Name is required' }
    });
  }

  try {
    const id = crypto.randomUUID();
    const result = await this.fastify.db.query(
      `INSERT INTO projects (id, name, description, type, repository, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
       RETURNING *`,
      [id, name, description || '', type || 'general', repository || '']
    );

    return reply.code(201).send({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create project' }
    });
  }
}
```

**Validation Criteria**:
- [ ] POST /api/projects returns 201 with project object
- [ ] Database contains new row in `projects` table
- [ ] GET /api/projects includes the new project

---

#### Step 3: Implement ProjectController.updateProject()

**What**: Replace stub with real database UPDATE for modifying projects
**Why**: Need ability to change project details after creation
**File**: Same as Step 2

**Changes**:
- Extract project ID from params
- Extract update fields from body
- Update `projects` table WHERE id = $1
- Return updated project

**Implementation**:
```typescript
async updateProject(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const updates = request.body as Record<string, unknown>;

  try {
    // Build dynamic update query
    const fields = Object.keys(updates).filter(k =>
      ['name', 'description', 'status', 'type', 'repository'].includes(k)
    );

    if (fields.length === 0) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' }
      });
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => updates[f]);

    const result = await this.fastify.db.query(
      `UPDATE projects SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    return reply.send({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update project' }
    });
  }
}
```

**Validation Criteria**:
- [ ] PATCH /api/projects/:id returns 200 with updated project
- [ ] Database row reflects changes
- [ ] GET /api/projects/:id shows updated data

---

#### Step 4: Implement ProjectController.deleteProject()

**What**: Replace stub with real database DELETE for removing projects
**Why**: Complete CRUD operations for projects
**File**: Same as Step 2

**Implementation**:
```typescript
async deleteProject(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  try {
    const result = await this.fastify.db.query(
      'DELETE FROM projects WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    return reply.send({
      success: true,
      data: { message: 'Project deleted successfully' }
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete project' }
    });
  }
}
```

**Validation Criteria**:
- [ ] DELETE /api/projects/:id returns 200
- [ ] Database no longer contains the row
- [ ] GET /api/projects/:id returns 404

---

#### Step 5: Add Database Connection to TaskService

**What**: Initialize PostgreSQL client in task service constructor
**Why**: Task service needs database to persist tasks
**File**: `services/task-service/src/index.ts`

**Changes**:
- Import `pg` library
- Add `database` property to TaskService class
- Initialize Pool in constructor with DATABASE_URL
- Connect to database in `initialize()` method
- Add cleanup in `stop()` method

**Implementation**:
```typescript
import { Pool } from 'pg';

class TaskService {
  private fastify: any;
  private config: TaskServiceConfig;
  private redis: any;
  private database: Pool;

  constructor() {
    // ... existing code ...

    this.database = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async initialize(): Promise<void> {
    // ... existing code ...

    // Test database connection
    await this.database.query('SELECT 1');
    this.fastify.log.info('Database connection established');
  }

  async stop(): Promise<void> {
    // ... existing code ...

    if (this.database) {
      await this.database.end();
    }
  }
}
```

**Validation Criteria**:
- [ ] Task service starts without errors
- [ ] Health check confirms database connectivity
- [ ] Logs show successful database connection

---

#### Step 6: Implement TaskService GET /tasks with Database

**What**: Replace empty array with real database SELECT
**Why**: Need to fetch real tasks from database
**File**: Same as Step 5

**Implementation**:
```typescript
this.fastify.get('/tasks', async (request: any) => {
  const { projectId } = request.query;

  let query = 'SELECT * FROM tasks ORDER BY created_at DESC';
  const params: string[] = [];

  if (projectId) {
    query = 'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC';
    params.push(projectId);
  }

  const result = await this.database.query(query, params);

  return {
    success: true,
    data: result.rows,
  };
});
```

**Validation Criteria**:
- [ ] GET /api/tasks returns array (empty initially)
- [ ] Response structure matches Task type
- [ ] Optional projectId filter works

---

#### Step 7: Implement TaskService POST /tasks with Database Persistence

**What**: Replace mock response with real database INSERT
**Why**: This is the critical persistence point for new tasks
**File**: Same as Step 5

**Implementation**:
```typescript
this.fastify.post('/tasks', async (request: any, reply: any) => {
  const { title, description, type, priority, projectId, assignedAgent } = request.body;

  if (!title) {
    return reply.code(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Title is required' }
    });
  }

  const taskId = uuid();

  const result = await this.database.query(
    `INSERT INTO tasks (id, title, description, type, priority, project_id, assigned_agent, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
     RETURNING *`,
    [taskId, title, description || '', type || 'general', priority || 'medium', projectId || null, assignedAgent || null]
  );

  return reply.code(201).send({
    success: true,
    data: result.rows[0],
    message: 'Task created successfully',
  });
});
```

**Validation Criteria**:
- [ ] POST /api/tasks returns 201 with task object containing UUID
- [ ] Database contains new row in `tasks` table
- [ ] GET /api/tasks includes the new task
- [ ] Task persists after service restart

---

#### Step 8: Fix AuthService.generateJWT() with Real JWT Signing

**What**: Replace mock token with properly signed JWT
**Why**: Frontend needs valid JWTs for authentication
**File**: `services/auth-service/src/services/AuthService.ts`

**Implementation**:
```typescript
private async generateJWT(payload: any, expiresIn: string): Promise<string> {
  // Use jsonwebtoken library for proper JWT signing
  const jwt = require('jsonwebtoken');

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'dev-secret-key',
    { expiresIn }
  );
}
```

**Validation Criteria**:
- [ ] Login returns valid JWT token
- [ ] Token can be decoded with jwt.io
- [ ] Token includes correct userId and expiry
- [ ] Token validates successfully on protected routes

---

### Phase 2: Frontend Mock Data Removal (Presentation Layer)

#### Step 9: Remove mockTasks from useTasks.ts

**What**: Delete mock data array and fallback logic
**Why**: Backend now provides real data
**File**: `frontend/src/hooks/useTasks.ts`

**Changes**:
- Delete `mockTasks` array (lines 31-86)
- Remove try/catch fallback in `fetchTasks()` function
- Let API errors propagate naturally
- Remove fallback in `useTask()` hook

**Before**:
```typescript
async function fetchTasks(projectId?: string): Promise<DisplayTask[]> {
  try {
    const tasks = await api.getTasks(projectId);
    return tasks as DisplayTask[];
  } catch {
    logger.warn('API not available, using mock task data');
    return mockTasks;
  }
}
```

**After**:
```typescript
async function fetchTasks(projectId?: string): Promise<DisplayTask[]> {
  const tasks = await api.getTasks(projectId);
  return tasks as DisplayTask[];
}
```

**Validation Criteria**:
- [ ] Page loads without mock data
- [ ] Tasks display correctly when backend is running
- [ ] Empty state shows when no tasks exist
- [ ] Errors display appropriately when backend is down

---

#### Step 10: Remove mockProjects from useProjects.ts

**What**: Delete mock data array and fallback logic
**Why**: Backend now provides real data
**File**: `frontend/src/hooks/useProjects.ts`

**Changes**:
- Delete `mockProjects` array (lines 18-49)
- Remove try/catch fallback in `fetchProjects()` function
- Remove fallback in `useProject()` hook

**Validation Criteria**:
- [ ] Page loads without mock data
- [ ] Projects display correctly when backend is running
- [ ] Empty state shows when no projects exist
- [ ] Create project flow works end-to-end

---

#### Step 11: Remove mockAgents from useAgents.ts

**What**: Delete mock data array and fallback logic
**Why**: Backend should provide real agent status
**File**: `frontend/src/hooks/useAgents.ts`

**Changes**:
- Delete `mockAgents` array (lines 19-98)
- Remove try/catch fallback in `fetchAgents()` function
- Remove fallback in `useAgent()` hook

**Validation Criteria**:
- [ ] Agents page loads without mock data
- [ ] Real agent status displays from orchestrator service
- [ ] Empty state shows appropriately
- [ ] Agent stats calculate correctly

---

#### Step 12: Remove Duplicate agentData from page.tsx

**What**: Delete local state and fetchAgentData function
**Why**: Should use useAgents() hook instead
**File**: `frontend/src/app/page.tsx`

**Changes**:
- Remove `agents` state (line 15)
- Remove `fetchAgentData()` function (lines 23-137)
- Remove `useEffect` that calls it (lines 18-21)
- Import and use `useAgents()` hook
- Map over `agents` from hook instead of local state

**Before**:
```typescript
const [agents, setAgents] = useState<Agent[]>([]);

useEffect(() => {
  fetchAgentData();
}, []);

const fetchAgentData = async () => {
  // ... 100+ lines of hardcoded data
};
```

**After**:
```typescript
import { useAgents, useAgentStats } from '@/hooks';

export default function AgentDashboard() {
  const { data: agents, isLoading, error } = useAgents();
  const { stats } = useAgentStats();
  // ... rest of component
}
```

**Validation Criteria**:
- [ ] Dashboard displays agents from hook
- [ ] No duplicate data fetching
- [ ] Stats update correctly
- [ ] Drag-and-drop still works

---

#### Step 13: Connect TaskSubmissionForm to API

**What**: Replace comment with actual API call using useCreateTask hook
**Why**: Form submissions should persist to database
**File**: `frontend/src/components/tasks/TaskSubmissionForm.tsx`

**Changes**:
- Import `useCreateTask` from hooks
- Import `useAgents` for dropdown options
- Use mutation instead of console.log
- Handle success/error states
- Show success message on completion

**Implementation**:
```typescript
import { useCreateTask } from '@/hooks/useTasks';
import { useAgents } from '@/hooks/useAgents';

export function TaskSubmissionForm({ onSubmit, onClose }: TaskSubmissionFormProps) {
  const { data: agentsList } = useAgents();
  const createTask = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const taskData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };

      await createTask.mutateAsync(taskData);

      if (onSubmit) {
        onSubmit(taskData);
      }

      // Reset form
      setFormData({ /* ... */ });
      onClose?.();
    } catch (error) {
      console.error('Failed to submit task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use agentsList for dropdown instead of hardcoded array
}
```

**Validation Criteria**:
- [ ] Form submission creates task in database
- [ ] Success message displays
- [ ] Task list refreshes automatically
- [ ] Form resets after submission
- [ ] Errors display appropriately

---

### Phase 3: State Persistence (Enhancement Layer)

#### Step 14: Create Agent Order Persistence API Endpoint

**What**: Add POST /api/agents/order endpoint to save agent ordering
**Why**: User's agent order should persist across sessions
**File**: Create new endpoint in orchestrator service

**Database Migration**:
```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY,
  agent_order JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Implementation**:
```typescript
fastify.post('/api/agents/order', async (request, reply) => {
  const { orderedIds } = request.body as { orderedIds: string[] };
  const userId = request.user?.id || 'default';

  await db.query(
    `INSERT INTO user_preferences (user_id, agent_order, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET agent_order = $2, updated_at = NOW()`,
    [userId, JSON.stringify(orderedIds)]
  );

  return reply.send({ success: true });
});
```

**Validation Criteria**:
- [ ] POST /api/agents/order saves successfully
- [ ] Database contains order preference
- [ ] Can retrieve saved order

---

#### Step 15: Implement Agent Order Retrieval

**What**: Load user's saved agent order on page load
**Why**: Restore previous ordering preference
**File**: Same as Step 14 + frontend page.tsx

**Implementation**:
```typescript
fastify.get('/api/agents/order', async (request, reply) => {
  const userId = request.user?.id || 'default';

  const result = await db.query(
    'SELECT agent_order FROM user_preferences WHERE user_id = $1',
    [userId]
  );

  return reply.send({
    success: true,
    data: result.rows[0]?.agent_order || []
  });
});
```

**Validation Criteria**:
- [ ] Page loads with saved order
- [ ] New users get default order
- [ ] Order persists across sessions

---

#### Step 16: Connect useUpdateAgentOrder to API

**What**: Replace local-only mutation with API call
**Why**: Make agent reordering persistent
**File**: `frontend/src/hooks/useAgents.ts`

**Before**:
```typescript
export function useUpdateAgentOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      // In a real implementation, this would call the API
      // For now, we just update the local cache
      return newOrder;
    },
    // ...
  });
}
```

**After**:
```typescript
export function useUpdateAgentOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      const response = await fetch(`${API_BASE_URL}/api/agents/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newOrder }),
      });
      if (!response.ok) throw new Error('Failed to save agent order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
    },
  });
}
```

**Validation Criteria**:
- [ ] Drag-and-drop saves to database
- [ ] Order persists after refresh
- [ ] Multiple users have independent orders

---

#### Step 17: Create Settings Persistence API Endpoints

**What**: Add CRUD endpoints for user preferences
**Why**: Settings changes should save to database
**File**: Create in auth-service

**Implementation**:
```typescript
// GET /api/users/me/settings
fastify.get('/api/users/me/settings', async (request, reply) => {
  const userId = request.user.id;

  const result = await db.query(
    'SELECT preferences FROM users WHERE id = $1',
    [userId]
  );

  return reply.send({
    success: true,
    data: result.rows[0]?.preferences || {}
  });
});

// PATCH /api/users/me/settings
fastify.patch('/api/users/me/settings', async (request, reply) => {
  const userId = request.user.id;
  const settings = request.body;

  await db.query(
    `UPDATE users SET preferences = preferences || $2, updated_at = NOW() WHERE id = $1`,
    [userId, JSON.stringify(settings)]
  );

  return reply.send({ success: true });
});
```

**Validation Criteria**:
- [ ] GET returns current settings
- [ ] PATCH updates database
- [ ] Settings persist across sessions

---

#### Step 18: Connect Settings Page to API

**What**: Wire up Save Changes button to persist settings
**Why**: Complete settings persistence
**File**: `frontend/src/app/settings/page.tsx`

**Implementation**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/settings');
      if (!response.ok) throw new Error('Failed to load settings');
      return response.json();
    },
  });
}

function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const response = await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
```

**Validation Criteria**:
- [ ] Settings load from database
- [ ] Save button persists changes
- [ ] Success message displays
- [ ] Settings survive page refresh

---

### Phase 4: Testing and Validation

#### Step 19: Create End-to-End Test Script

**What**: Write automated test for complete flow
**Why**: Verify all persistence works together

**Test Script**:
```bash
#!/bin/bash
# e2e-persistence-test.sh

set -e

API_URL="http://localhost:3000"

echo "=== E2E Persistence Test ==="

# 1. Create project
echo "Creating project..."
PROJECT=$(curl -s -X POST "$API_URL/api/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"E2E Test"}')
PROJECT_ID=$(echo $PROJECT | jq -r '.data.id')
echo "Created project: $PROJECT_ID"

# 2. Create task
echo "Creating task..."
TASK=$(curl -s -X POST "$API_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Task\",\"projectId\":\"$PROJECT_ID\"}")
TASK_ID=$(echo $TASK | jq -r '.data.id')
echo "Created task: $TASK_ID"

# 3. Verify task exists
echo "Verifying task..."
TASKS=$(curl -s "$API_URL/api/tasks?projectId=$PROJECT_ID")
COUNT=$(echo $TASKS | jq '.data | length')
if [ "$COUNT" -eq "1" ]; then
  echo "Task verified!"
else
  echo "FAILED: Expected 1 task, got $COUNT"
  exit 1
fi

# 4. Cleanup
echo "Cleaning up..."
curl -s -X DELETE "$API_URL/api/projects/$PROJECT_ID"

echo "=== All tests passed! ==="
```

**Validation Criteria**:
- [ ] All tests pass
- [ ] Data survives service restart
- [ ] No mock data remains

---

#### Step 20: Update Documentation

**What**: Document the persistence architecture
**Why**: Future developers need to understand the system

**Changes**:
- Update CLAUDE.md with persistence details
- Document database schema
- Add API endpoint documentation
- Include troubleshooting guide

**Validation Criteria**:
- [ ] Documentation is clear and complete
- [ ] Examples work as written
- [ ] Architecture is well explained

---

## Risk Assessment and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database schema mismatch | Medium | High | Run schema verification first, create migrations |
| Breaking existing sessions | Low | Medium | Implement token refresh, graceful logout |
| UI shows errors during transition | High | Medium | Feature flag to enable gradually |
| NATS message format breaks orchestrator | Medium | High | Version messages, test with orchestrator |
| Data loss during migration | Low | High | Backup database before changes |
| Partial implementation leaves inconsistent state | Medium | High | Atomic deployments per service |

---

## Feature Flag Strategy (Optional)

For a graceful transition, implement a feature flag:

```typescript
// frontend/src/config/features.ts
export const FEATURES = {
  USE_REAL_API: process.env.NEXT_PUBLIC_USE_REAL_API === 'true',
};

// In hooks
const { data } = useQuery({
  queryKey: ['projects'],
  queryFn: FEATURES.USE_REAL_API ? fetchRealProjects : () => mockProjects,
});
```

**Deployment sequence**:
1. Deploy backend fixes with feature flag OFF
2. Test backend APIs directly (curl, Postman)
3. Enable feature flag in staging
4. Verify full integration
5. Enable feature flag in production
6. Remove mock data and feature flag code

---

## Summary

| Phase | Steps | Focus | Estimated Effort |
|-------|-------|-------|------------------|
| **Phase 1** | 1-8 | Backend Database Persistence | 3-4 days |
| **Phase 2** | 9-13 | Frontend Mock Removal | 1-2 days |
| **Phase 3** | 14-18 | State Persistence | 2-3 days |
| **Phase 4** | 19-20 | Testing & Documentation | 1 day |
| **Total** | 20 steps | Complete Persistence | ~8-10 days |

### Key Principles

1. **Backend First** - Fix persistence before removing mocks
2. **One Change at a Time** - Each step is atomic and validatable
3. **Validate After Each Step** - Confirm success before proceeding
4. **Commit After Each Step** - Preserve progress

---

## Execution Checklist

- [ ] Step 1: Verify Database Schema
- [ ] Step 2: Implement createProject()
- [ ] Step 3: Implement updateProject()
- [ ] Step 4: Implement deleteProject()
- [ ] Step 5: Add Database to TaskService
- [ ] Step 6: Implement GET /tasks
- [ ] Step 7: Implement POST /tasks
- [ ] Step 8: Fix generateJWT()
- [ ] Step 9: Remove mockTasks
- [ ] Step 10: Remove mockProjects
- [ ] Step 11: Remove mockAgents
- [ ] Step 12: Remove duplicate agentData
- [ ] Step 13: Connect TaskSubmissionForm
- [ ] Step 14: Create agent order API
- [ ] Step 15: Implement order retrieval
- [ ] Step 16: Connect useUpdateAgentOrder
- [ ] Step 17: Create settings API
- [ ] Step 18: Connect settings page
- [ ] Step 19: E2E test script
- [ ] Step 20: Update documentation

---

**Remember: The process is the product. Take Baby Steps.**
