# Active Dev-Team Projects

This file tracks all active projects delegated to the dev-team platform.

## Current Projects

_No active projects yet_

---

## Project Template

When starting a new project, add an entry:

```markdown
### [Project Name] - Started [Date]

**Project ID**: [id from API]
**Complexity Score**: [calculated score]
**Status**: [active | review | completed]
**Priority**: [high | medium | low]

**Description**:
[Brief description of what this project does]

**Requirements**:
- [Key requirement 1]
- [Key requirement 2]
- [Key requirement 3]

**Tasks**:
1. [Task 1] - [agent type] - [status]
2. [Task 2] - [agent type] - [status]
3. [Task 3] - [agent type] - [status]

**Agents Assigned**:
- Frontend: [task count]
- Backend: [task count]
- QA: [task count]
- DevOps: [task count]
- MCP: [task count]

**Progress**: [X/Y] tasks completed ([percentage]%)

**Notes**:
- [Any important observations]
- [Blockers or challenges]
- [Key decisions made]

**Last Updated**: [timestamp]
```

---

## Completed Projects Archive

### Example Project - Completed 2025-01-10

**Project ID**: 1
**Complexity Score**: 45
**Duration**: 3 hours
**Final Status**: Success

**What Was Built**:
- React todo application
- Express REST API
- PostgreSQL database
- Docker deployment

**Agents Used**:
- Frontend: 2 tasks
- Backend: 3 tasks
- QA: 2 tasks
- DevOps: 1 task

**Quality Metrics**:
- Code Quality: 9/10
- Test Coverage: 85%
- First-try Success: 75%
- Revisions Needed: 2 tasks

**Key Learnings**:
- Breaking down tasks into smaller chunks improved success rate
- Providing clear acceptance criteria reduced revision cycles
- DevOps tasks should be created after QA approval

**Files Created**: 15
**Total Lines of Code**: ~800

---

## Usage Instructions

1. **Starting a Project**:
   - Calculate complexity score
   - Create project entry under "Current Projects"
   - Update as tasks progress

2. **During Development**:
   - Update task statuses regularly
   - Note any blockers or issues
   - Track agent performance

3. **On Completion**:
   - Move to "Completed Projects Archive"
   - Document learnings
   - Update success metrics

4. **Automatic Updates**:
   - This file should be updated automatically when:
     * New project created
     * Task status changes
     * Project completed
     * Issues encountered
