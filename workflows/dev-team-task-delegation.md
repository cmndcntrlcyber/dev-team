---
description: Systematic workflow for delegating complex programming tasks to dev-team agents
author: Workspace System
version: 1.0
tags: [workflow, task-delegation, dev-team, project-management]
trigger: Complex Task Request
---

# Dev-Team Task Delegation Workflow

## 🎯 Purpose
Guide Cline through the process of analyzing tasks, deciding whether to delegate to dev-team, and managing the delegation lifecycle.

## 🤔 Task Analysis Phase

### Step 1: Analyze Task Complexity

Calculate complexity score based on:

```javascript
Complexity Score Calculation:
- Files to modify: [count] × 2 points
- New files to create: [count] × 3 points  
- Components/modules needed: [count] × 5 points
- Integration points (APIs, DBs, services): [count] × 4 points
- Technology stack changes: [yes=10, no=0]

Examples:
- "Fix typo in README": 1 file × 2 = 2 points → Handle directly
- "Add login form": 2 files × 3 + 1 component × 5 = 11 points → Consider delegation
- "Build full-stack todo app": 10 files × 3 + 5 components × 5 + 3 integrations × 4 = 67 points → Delegate
```

### Step 2: Make Delegation Decision

```
<thinking>
Task: [describe task]
Complexity Score: [calculated score]

Files Analysis:
- To modify: [list with reasons]
- To create: [list with reasons]
- Components: [list]
- Integration points: [list]

Decision Matrix:
- Score 0-10: Handle directly (simple task)
- Score 11-25: Ask user preference (borderline case)
- Score 26+: Delegate to dev-team (complex task)

Recommended Action: [Handle directly | Ask user | Delegate]
Reasoning: [explain why]
</thinking>
```

### Step 3: Inform User of Decision

**For direct handling:**
```
📝 Task Analysis: [Task Name]
Complexity: Low (Score: [X])
Action: I'll handle this directly

Proceeding with implementation...
```

**For borderline cases:**
```
📝 Task Analysis: [Task Name]
Complexity: Medium (Score: [X])

This task could be handled either way:
- Direct: Faster feedback, simpler coordination
- Delegated: Leverage specialized agents, parallel work

Your preference?
```

**For delegation:**
```
📝 Task Analysis: [Task Name]
Complexity: High (Score: [X])
Action: Delegating to dev-team agents

This task will benefit from specialized agents working in parallel.
I'll coordinate the work and verify quality at each checkpoint.

Proceeding with delegation...
```

## 🚀 Delegation Phase

### Step 1: Create Project in Dev-Team

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "[Clear, descriptive project name]",
    "description": "[Detailed requirements, context, and objectives]",
    "status": "active",
    "priority": "high"
  }'
```

**Store the project ID** from response for subsequent API calls.

### Step 2: Break Down into Agent-Specific Tasks

Analyze requirements and create task breakdown:

#### Frontend Tasks
For UI/UX work:
```json
{
  "title": "Create React Components",
  "description": "Components needed:\n- [Component 1]: [purpose]\n- [Component 2]: [purpose]\n\nRequirements:\n- Responsive design\n- Accessibility (WCAG 2.1)\n- Props interface documentation",
  "assignedTo": "frontend",
  "priority": "high"
}
```

#### Backend Tasks
For server-side work:
```json
{
  "title": "Implement API Endpoints",
  "description": "Endpoints:\n- POST /api/[resource]: [purpose]\n- GET /api/[resource]: [purpose]\n\nRequirements:\n- Request validation\n- Error handling\n- OpenAPI documentation",
  "assignedTo": "backend",
  "priority": "high",
  "dependencies": []
}
```

#### Database Tasks
For data layer:
```json
{
  "title": "Design Database Schema",
  "description": "Tables:\n- [table1]: [columns and types]\n- [table2]: [columns and types]\n\nRelationships:\n- [describe relationships]\n\nRequirements:\n- Migrations included\n- Indexes on key columns",
  "assignedTo": "backend",
  "priority": "high"
}
```

#### QA Tasks
For testing:
```json
{
  "title": "Create Test Suite",
  "description": "Testing requirements:\n- Unit tests: [coverage targets]\n- Integration tests: [scenarios]\n- E2E tests: [user flows]\n\nTargets:\n- 80%+ code coverage\n- All critical paths tested",
  "assignedTo": "qa",
  "priority": "medium",
  "dependencies": [frontend_task_id, backend_task_id]
}
```

#### DevOps Tasks
For deployment:
```json
{
  "title": "Setup Deployment Pipeline",
  "description": "Requirements:\n- Dockerfile for application\n- Docker Compose for local dev\n- CI/CD pipeline (GitHub Actions)\n- Environment configurations",
  "assignedTo": "devops",
  "priority": "low",
  "dependencies": [qa_task_id]
}
```

### Step 3: Create All Tasks via API

```bash
# Example for each task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": [project_id],
    "title": "[task title]",
    "description": "[detailed description]",
    "status": "pending",
    "priority": "high|medium|low",
    "assignedTo": "[frontend|backend|qa|devops|mcp]",
    "dependencies": [array of task IDs]
  }'
```

**Store all task IDs** for monitoring.

### Step 4: Display Delegation Summary

```
✅ Project Created: [Project Name]
Project ID: [id]

📋 Tasks Created:
1. [Frontend] Create React Components (ID: [id])
2. [Backend] Implement API Endpoints (ID: [id])
3. [Backend] Design Database Schema (ID: [id])
4. [QA] Create Test Suite (ID: [id]) - Depends on: 1, 2
5. [DevOps] Setup Deployment (ID: [id]) - Depends on: 4

🔄 Monitoring tasks for completion...
```

## 📊 Monitoring Phase

### Step 1: Active Monitoring Loop

Poll for task status every 30 seconds while tasks are active:

```bash
curl -s "http://localhost:5000/api/tasks?projectId=[project_id]&status=in_progress"
```

### Step 2: Status Updates

Provide periodic updates to user:

```
⏳ Dev-Team Progress Update:

Completed:
✅ [Task 1 name]

In Progress:
🔄 [Task 2 name] - [agent type]
🔄 [Task 3 name] - [agent type]

Pending:
⏸️ [Task 4 name] - Waiting for: [dependency]

Estimated completion: [time based on progress]
```

### Step 3: Checkpoint Triggers

Watch for these status changes:
- `pending` → `in_progress`: Agent started working
- `in_progress` → `review`: Agent completed, needs verification
- `review` → `completed`: Cline approved
- `review` → `pending`: Cline requested changes
- `*` → `blocked`: Issue detected, needs resolution

## ✅ Verification Phase

### When Task Status = "review"

#### Step 1: Fetch Task Details
```bash
curl -s "http://localhost:5000/api/tasks/[task_id]"
```

#### Step 2: Read Generated Code

For each file mentioned in task output:
```
<read_file>
<path>[file_path]</path>
</read_file>
```

#### Step 3: Quality Assessment

Check against criteria:

**Code Quality:**
- [ ] Follows best practices for language/framework
- [ ] Proper error handling implemented
- [ ] Code is readable and well-commented
- [ ] No obvious bugs or logic errors
- [ ] Security considerations addressed

**Requirements:**
- [ ] All specified features implemented
- [ ] Edge cases handled
- [ ] User requirements met exactly
- [ ] Documentation included

**Integration:**
- [ ] Compatible with existing codebase
- [ ] APIs match specification
- [ ] Database schema correct
- [ ] Dependencies properly declared

**Testing:**
- [ ] Unit tests present and passing
- [ ] Integration tests cover key paths
- [ ] Manual testing performed (if applicable)

#### Step 4: Make Approval Decision

**If ALL checks pass:**
```bash
# Approve task
curl -X PUT "http://localhost:5000/api/tasks/[task_id]" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

Display to user:
```
✅ Task Approved: [Task Name]
Quality Score: [assessment]
All requirements met. Moving to next task.
```

**If issues found:**
```bash
# Request changes
curl -X PUT "http://localhost:5000/api/tasks/[task_id]" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "pending",
    "description": "[Original description]\n\n--- FEEDBACK ---\n[Specific issues and requirements]"
  }'
```

Display to user:
```
⚠️ Task Needs Revision: [Task Name]

Issues Found:
1. [Specific issue with location/line number]
2. [What doesn't meet requirements]
3. [Bugs or errors discovered]

Requirements:
1. [What needs to be changed]
2. [Expected behavior]
3. [Quality standards to meet]

Re-assigning to agent for corrections...
```

## 🎯 Completion Phase

### When All Tasks Completed

#### Step 1: Final Integration Tests

```bash
# If project has tests
cd [project_directory]
npm test  # or appropriate test command

# If project can run
npm run dev  # or appropriate run command
```

#### Step 2: Documentation Verification

Check for:
- [ ] README.md with setup instructions
- [ ] API documentation (if applicable)
- [ ] Environment variable requirements
- [ ] Deployment instructions

#### Step 3: Mark Project Complete

```bash
curl -X PUT "http://localhost:5000/api/projects/[project_id]" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "completedAt": "[ISO timestamp]"
  }'
```

#### Step 4: Present Results to User

```
<attempt_completion>
<result>
Project completed successfully via dev-team agents! 🎉

📦 Deliverables:
[List all files and components created]

✅ Features Implemented:
[List all completed features]

🧪 Testing:
- Unit Tests: [X/Y passing]
- Integration Tests: [X/Y passing]
- Code Coverage: [percentage]

📚 Documentation:
- README.md: Complete
- API Docs: [link or status]
- Setup Guide: Included

🎯 Quality Metrics:
- Code Quality: [score/assessment]
- Requirements Met: ✅ All
- Security: ✅ Reviewed
- Performance: ✅ Acceptable

📂 Location: [project directory]
🚀 To run: [command]
</result>
<command>[command to demo/run the project]</command>
</attempt_completion>
```

## 🔄 Feedback Loop

### If Changes Requested by User

After presenting completion:

1. **Analyze feedback**:
   - What needs to change?
   - Which tasks are affected?
   - New requirements or modifications?

2. **Create follow-up tasks**:
   ```bash
   curl -X POST http://localhost:5000/api/tasks \
     -H "Content-Type: application/json" \
     -d '{
       "projectId": [project_id],
       "title": "Update: [what to change]",
       "description": "[detailed feedback and requirements]",
       "status": "pending",
       "assignedTo": "[appropriate agent]"
     }'
   ```

3. **Continue monitoring** until user satisfied

## 📝 Memory Bank Update

After successful project completion:

Update `memory-bank/dev-team-integration/integration-patterns.md`:

```markdown
## [Project Name] - [Date]

**Task Type**: [full-stack app | API service | frontend | MCP server | etc]
**Complexity Score**: [score]
**Agents Used**: [list agents and their tasks]
**Duration**: [total time from start to completion]

**Task Breakdown:**
- Frontend: [summary]
- Backend: [summary]
- QA: [summary]
- DevOps: [summary]

**Success Factors:**
- [What worked well]
- [Effective patterns used]
- [Good delegation strategies]

**Challenges:**
- [Issues encountered]
- [How they were resolved]
- [What to watch for next time]

**Lessons Learned:**
- [Insights for future projects]
- [Better approaches identified]
- [Pitfalls to avoid]

**Quality Metrics:**
- First-try completion rate: [percentage]
- Average review cycles: [number]
- Code quality score: [rating]
- User satisfaction: [feedback]
```

## 🚨 Error Handling

### Agent Not Responding
```
⚠️ Agent Timeout: [Agent Name]
Task: [Task Name]

Actions:
1. Checking agent status...
2. Re-assigning to backup agent...
3. Continuing with other tasks...
```

### Task Blocked
```
🚫 Task Blocked: [Task Name]
Blocker: [Issue description]

Actions:
1. Analyzing dependency chain...
2. Attempting to resolve blocker...
3. If unresolvable, will escalate to user...
```

### Service Interruption
```
❌ Dev-Team Service Unavailable

Actions:
1. Checking service health...
2. Attempting service restart...
3. If service down, will pause delegation...
4. Will resume when service restored...
```

---

**This workflow ensures systematic, high-quality task delegation with comprehensive verification at every step.**
