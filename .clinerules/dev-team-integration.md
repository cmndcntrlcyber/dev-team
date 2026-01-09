---
description: Cline workspace integration with dev-team multi-agent platform for complex task delegation
author: Workspace System
version: 1.0
tags: [workspace-rules, dev-team, ai-agents, task-delegation, orchestration]
globs: ["**/*"]
---

# Dev-Team Integration Workflow

## 🎯 Purpose
This rule defines how Cline integrates with the dev-team multi-agent platform to delegate complex programming tasks while maintaining quality oversight and verification at each checkpoint.

## 🏗️ Architecture Overview

```
Cline (Orchestrator)
    ↓
Dev-Team API (localhost:5000)
    ↓
Specialized Agents:
    - Architecture Agent (Port 3010)
    - Frontend Agent (Port 3011)
    - Backend Agent (Port 3012)
    - QA Agent (Port 3013)
    - DevOps Agent (Port 3014)
    - MCP Agent (Port 3015)
```

## 1. Startup Protocol (VS Code Launch)

**MANDATORY: Execute at VS Code startup before any task work**

### Service Health Check
```bash
# Check if dev-team services are running
docker ps --filter "name=dev-team" --format "{{.Names}}: {{.Status}}"
```

### Automatic Startup Sequence
If services NOT running:
1. **Start Services**:
   ```bash
   cd /home/cmndcntrl/code/dev-team && docker compose -f docker-compose.simple.yml up -d
   ```

2. **Wait for Health**:
   - Postgres: ~10 seconds
   - App: ~15 seconds
   - Total wait: 30 seconds

3. **Verify Connectivity**:
   ```bash
   curl -s http://localhost:5000/api/dashboard/stats
   ```

4. **Load Agent Roster**:
   ```bash
   curl -s http://localhost:5000/api/ai-agents
   ```

### Status Display
Always inform user of dev-team status:
- ✅ Services Running (App: port 5000, DB: port 5432)
- 🔄 Starting Services...
- ❌ Services Failed to Start
- 📊 Agents Available: [list agent types and status]

## 2. Task Analysis & Delegation Decision

**When to Delegate to Dev-Team:**

### ✅ Delegate These Tasks:
- **Full-stack applications** (React + Backend + Database)
- **Multi-file projects** (>5 files to create/modify)
- **Complex architecture** (microservices, distributed systems)
- **Complete features** (user auth, payment processing, etc.)
- **Project scaffolding** (new applications from scratch)
- **Testing suites** (comprehensive test coverage)
- **DevOps pipelines** (CI/CD, containerization)
- **MCP server development** (custom tool/resource creation)

### ❌ Handle Directly (Don't Delegate):
- **Single file edits** (bug fixes, typos)
- **Simple scripts** (<50 lines)
- **Quick debugging** (immediate user assistance)
- **Documentation updates** (README changes)
- **Configuration tweaks** (single config file)
- **Code review** (analysis without execution)

### Decision Algorithm:
```
<thinking>
Task Complexity Score:
- Files to modify: [count] × 2 points
- New files to create: [count] × 3 points
- Components needed: [count] × 5 points
- Integration points: [count] × 4 points

Total Score:
- 0-10: Handle directly
- 11-25: Consider delegation (ask user)
- 26+: Delegate to dev-team
</thinking>
```

## 3. Project Creation Workflow

**When delegating a task:**

### Step 1: Create Project
```javascript
POST http://localhost:5000/api/projects
{
  "name": "[Descriptive project name]",
  "description": "[Detailed requirements and objectives]",
  "status": "active",
  "priority": "high|medium|low",
  "deadline": "[ISO date if applicable]"
}
```

### Step 2: Break Down Requirements
Analyze task and create subtasks for each agent:

**Frontend Tasks:**
- UI components needed
- State management approach
- API integration requirements
- Responsive design specs

**Backend Tasks:**
- API endpoints to create
- Database schema design
- Authentication/authorization
- Business logic implementation

**QA Tasks:**
- Unit test coverage targets
- Integration test scenarios
- E2E test flows
- Security testing requirements

**DevOps Tasks:**
- Containerization setup
- CI/CD pipeline configuration
- Environment management
- Deployment strategy

### Step 3: Create Tasks via API
```javascript
POST http://localhost:5000/api/tasks
{
  "projectId": [project_id],
  "title": "[Task title]",
  "description": "[Detailed task requirements]",
  "status": "pending",
  "priority": "high|medium|low",
  "assignedTo": "[agent type: frontend|backend|qa|devops|mcp]",
  "dependencies": [array of task IDs this depends on]
}
```

## 4. Progress Monitoring Protocol

**Continuous Monitoring Loop:**

### Monitor Task Status
```javascript
// Poll every 30 seconds while tasks active
GET http://localhost:5000/api/tasks?projectId=[id]&status=in_progress

// Check agent status
GET http://localhost:5000/api/ai-agents
```

### Status Interpretation:
- **pending**: Task waiting to start
- **in_progress**: Agent actively working
- **review**: Ready for Cline verification
- **completed**: Approved by Cline
- **blocked**: Issue preventing progress
- **failed**: Task execution error

## 5. Quality Verification Checkpoints

**CRITICAL: Review ALL completed work before proceeding**

### Checkpoint Triggers:
- Agent marks task as "review" status
- Task completion notification received
- Dependency task completed
- Milestone reached

### Verification Process:

#### 1. Code Quality Check
```bash
# Read generated files
<read_file>
<path>[file generated by agent]</path>
</read_file>

# Verify:
- Code follows best practices
- No obvious bugs or errors
- Proper error handling
- Clear variable/function names
- Comments for complex logic
```

#### 2. Functionality Verification
```bash
# If applicable, run the code
<execute_command>
<command>cd [project_dir] && npm test</command>
<requires_approval>false</requires_approval>
</execute_command>

# Or start development server
<execute_command>
<command>cd [project_dir] && npm run dev</command>
<requires_approval>false</requires_approval>
</execute_command>
```

#### 3. Requirements Validation
- ✅ All specified features implemented
- ✅ User requirements met
- ✅ Edge cases handled
- ✅ Error scenarios considered

#### 4. Integration Check
- ✅ Works with existing code
- ✅ APIs compatible
- ✅ Database schema correct
- ✅ Dependencies resolved

### Approval Decision:
```javascript
// If ALL checks pass:
PUT http://localhost:5000/api/tasks/[task_id]
{
  "status": "completed"
}

// If issues found:
PUT http://localhost:5000/api/tasks/[task_id]
{
  "status": "pending",
  "description": "[Original description]\n\nFeedback:\n[Specific issues to fix]"
}
```

## 6. Feedback & Iteration Loop

**When work needs improvement:**

### Provide Specific Feedback:
```
❌ Issues Found:
1. [Specific issue with line numbers if possible]
2. [What doesn't meet requirements]
3. [Bugs or errors discovered]

✅ Requirements:
1. [What needs to be changed]
2. [Expected behavior]
3. [Quality standards to meet]

📋 Next Steps:
- Re-assign to agent with updated requirements
- Provide code examples if helpful
- Set clearer acceptance criteria
```

### Update Task:
```javascript
PUT http://localhost:5000/api/tasks/[task_id]
{
  "description": "[Updated with specific feedback]",
  "status": "pending"
}
```

## 7. Project Completion Protocol

**When all tasks completed and verified:**

### Final Validation:
1. **Integration Testing**:
   ```bash
   # Run full test suite
   <execute_command>
   <command>cd [project_dir] && npm run test:all</command>
   <requires_approval>false</requires_approval>
   </execute_command>
   ```

2. **Build Verification**:
   ```bash
   # Ensure project builds
   <execute_command>
   <command>cd [project_dir] && npm run build</command>
   <requires_approval>false</requires_approval>
   </execute_command>
   ```

3. **Documentation Check**:
   - README.md complete
   - API documentation present
   - Setup instructions clear
   - Dependencies documented

### Mark Project Complete:
```javascript
PUT http://localhost:5000/api/projects/[project_id]
{
  "status": "completed",
  "completedAt": "[ISO timestamp]"
}
```

### Deliver to User:
```
<attempt_completion>
<result>
Project completed successfully via dev-team agents!

📦 Deliverables:
- [List all files/components created]
- [Features implemented]
- [Tests passing: X/Y]
- [Documentation included]

🎯 Quality Metrics:
- Code Quality: [score/assessment]
- Test Coverage: [percentage]
- All Requirements Met: ✅

📂 Location: [project directory]
🚀 To run: [command to start/test]
</result>
<command>[command to demo/run the project]</command>
</attempt_completion>
```

## 8. Error Handling & Recovery

### Common Issues & Solutions:

**Services Not Running:**
```bash
# Restart services
docker compose -f docker-compose.simple.yml restart

# Check logs
docker compose -f docker-compose.simple.yml logs app
```

**API Connection Failed:**
```bash
# Verify service health
curl -v http://localhost:5000/api/dashboard/stats

# Check firewall/ports
netstat -tlnp | grep 5000
```

**Agent Not Responding:**
```javascript
// Check agent status
GET http://localhost:5000/api/ai-agents/[agent_id]

// Reassign task to different agent if needed
PUT http://localhost:5000/api/tasks/[task_id]
{
  "assignedTo": "[different_agent_type]",
  "status": "pending"
}
```

**Task Stuck/Blocked:**
```javascript
// Check for dependency issues
GET http://localhost:5000/api/tasks?projectId=[id]

// Unblock manually if needed
PUT http://localhost:5000/api/tasks/[task_id]
{
  "status": "pending",
  "dependencies": []
}
```

## 9. Memory Bank Integration

**Automatically track in memory bank:**

### After Each Successful Project:
Update `memory-bank/dev-team-integration/integration-patterns.md`:
```markdown
## [Project Name] - [Date]

**Task Type**: [full-stack app | API service | frontend | etc]
**Complexity**: [simple | medium | complex]
**Agents Used**: [list]
**Duration**: [time taken]
**Success Factors**:
- [What worked well]
- [Effective patterns]
- [Good delegation strategies]

**Lessons Learned**:
- [What to improve]
- [Better approaches]
- [Pitfalls to avoid]
```

## 10. Performance Optimization

**Maximize efficiency:**

### Parallel Task Execution:
- Create independent tasks simultaneously
- Don't wait for sequential tasks unnecessarily
- Use dependency chains only when required

### Smart Agent Assignment:
- Frontend → React, Vue, Angular work
- Backend → APIs, databases, authentication
- QA → Testing, quality checks
- DevOps → Docker, CI/CD, deployment
- MCP → External tool integrations

### Reduce API Calls:
- Batch task creation when possible
- Poll less frequently for long-running tasks
- Cache agent capabilities list

## 11. Chrome DevTools Integration for Browser-Based Tasks

**When to Use Chrome DevTools MCP:**

### ✅ Use Chrome DevTools For:
- **Debugging**: Console errors, JavaScript issues, DOM inspection
- **Troubleshooting**: Network failures, performance bottlenecks, form issues
- **UI/UX Testing**: Responsive design, visual regression, user flows
- **Accessibility**: WCAG compliance checks, keyboard navigation
- **Performance**: Core Web Vitals analysis, load time optimization

### 🚀 Chrome Startup Protocol

Before using Chrome DevTools tools, ensure Chrome is running:

```bash
# Check Chrome status
/home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh status

# Start if not running
/home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh start
```

### 📋 Common Chrome DevTools Workflows

#### Debugging Console Errors
```
1. Use cgIazK0mcp0navigate_page to open page
2. Use cgIazK0mcp0list_console_messages with types=['error']
3. Use cgIazK0mcp0get_network_request for failed API calls
4. Use cgIazK0mcp0take_screenshot to document state
5. Compile findings into debug report
```

#### Performance Analysis
```
1. Use cgIazK0mcp0performance_start_trace with reload=true
2. Wait for page load completion
3. Use cgIazK0mcp0performance_stop_trace
4. Use cgIazK0mcp0performance_analyze_insight for metrics
5. Generate performance recommendations
```

#### Responsive Design Testing
```
For each device size (mobile, tablet, desktop):
1. Use cgIazK0mcp0resize_page to set viewport
2. Use cgIazK0mcp0navigate_page to load page
3. Use cgIazK0mcp0take_screenshot with fullPage=true
4. Document layout issues
5. Compare across breakpoints
```

#### E2E User Flow Testing
```
1. Use cgIazK0mcp0navigate_page to start URL
2. Use cgIazK0mcp0fill_form for input fields
3. Use cgIazK0mcp0click for buttons/links
4. Use cgIazK0mcp0wait_for to verify state changes
5. Use cgIazK0mcp0list_console_messages to catch errors
6. Use cgIazK0mcp0take_screenshot at each step
```

### 🎯 Agent-Specific Chrome DevTools Usage

#### QA Agent
**Primary Use Cases:**
- Automated E2E testing of user flows
- Visual regression detection
- Cross-browser/device testing
- Accessibility validation
- Performance benchmarking

**Task Assignment Pattern:**
```javascript
{
  "title": "E2E Test: User Registration Flow",
  "description": "Use Chrome DevTools to test signup:\n1. Navigate to /signup\n2. Fill form fields\n3. Submit and verify\n4. Capture screenshots\n5. Check for console errors",
  "assignedTo": "qa",
  "tools": ["chrome-devtools"]
}
```

#### Frontend Agent
**Primary Use Cases:**
- Debug broken UI components
- Verify responsive design implementations
- Profile JavaScript performance
- Check CSS rendering issues
- Validate client-side logic

**Task Assignment Pattern:**
```javascript
{
  "title": "Debug Navigation Component",
  "description": "Component not rendering correctly:\n1. Inspect DOM structure\n2. Check console for JS errors\n3. Verify CSS styles\n4. Test across breakpoints\n5. Document findings",
  "assignedTo": "frontend",
  "tools": ["chrome-devtools"]
}
```

#### DevOps Agent
**Primary Use Cases:**
- Health check deployed applications
- Monitor production performance
- Validate SSL/TLS configurations
- Check CDN and caching behavior
- Verify deployment success

**Task Assignment Pattern:**
```javascript
{
  "title": "Production Health Check",
  "description": "Verify deployment:\n1. Check page loads successfully\n2. Monitor network requests\n3. Capture performance metrics\n4. Verify no console errors\n5. Generate health report",
  "assignedTo": "devops",
  "tools": ["chrome-devtools"]
}
```

### ⚠️ Chrome DevTools Best Practices

1. **Always start Chrome before using tools**
   ```bash
   /home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh start
   ```

2. **Take screenshots for visual documentation**
   - Use `cgIazK0mcp0take_screenshot` at key checkpoints
   - Include fullPage=true for complete views
   - Save to project directory for reference

3. **Monitor console for errors**
   - Use `cgIazK0mcp0list_console_messages` regularly
   - Filter by type (error, warning, log)
   - Document error messages and stack traces

4. **Capture network activity**
   - Use `cgIazK0mcp0list_network_requests` for API debugging
   - Check for failed requests (4xx, 5xx status codes)
   - Verify request/response payloads

5. **Include accessibility checks**
   - Use `cgIazK0mcp0take_snapshot` for DOM + ARIA info
   - Verify keyboard navigation with `cgIazK0mcp0press_key`
   - Check contrast ratios and semantic HTML

### 🔧 Troubleshooting Chrome DevTools

**Chrome Not Responding:**
```bash
# Restart Chrome
/home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh restart
```

**Tools Not Available:**
1. Verify Chrome is running on port 9222
2. Restart VS Code to reload MCP configuration
3. Check Cline MCP settings for chrome-devtools entry

**Page Not Loading:**
- Check URL is accessible
- Verify network connectivity
- Increase timeout if needed
- Check for authentication requirements

## 🚨 Critical Reminders

1. **ALWAYS check service status at startup**
2. **NEVER skip verification checkpoints**
3. **ALWAYS provide specific feedback on issues**
4. **UPDATE memory bank after successful projects**
5. **MONITOR task progress actively**
6. **DOCUMENT patterns and learnings**
7. **START Chrome before using DevTools MCP tools**

## 📊 Success Metrics

Track these for continuous improvement:
- **Task Completion Rate**: % of tasks completed first try
- **Quality Score**: Code quality ratings
- **Time to Completion**: Project duration
- **Feedback Iterations**: How many review cycles
- **User Satisfaction**: Was deliverable acceptable

---

**This integration makes Cline more powerful by leveraging specialized agents for complex work while maintaining quality control through systematic verification.**
