# SDLC Platform Transformation Plan

## Overview
This document outlines the complete transformation of the Dev Team Platform from a bug bounty/security testing platform to a full-featured SDLC (Software Development Lifecycle) project management platform.

## Completed: Database Schema Transformation

### ✅ Removed Security-Focused Tables
- ❌ `beacons` - C2 beacon tracking (Cobalt Strike, Metasploit)
- ❌ `networkDiscoveries` - Network scanning results  
- ❌ `remoteSessions` - RustDesk/RDP penetration testing
- ❌ `clientCertificates` - Security testing certificates
- ❌ `programs` - Bug bounty programs (HackerOne, Bugcrowd)
- ❌ `vulnerabilities` - Security vulnerabilities with CVSS/rewards
- ❌ `operations` - Red team operations
- ❌ `systems` - Compromised hosts/systems
- ❌ `reports` - Penetration testing reports

### ✅ New SDLC-Focused Tables

**1. `projects`** - Software Development Projects
- Replaced: `operations` (red team ops)
- Fields: name, description, repositoryUrl, status, methodology
- Team Management: teamSize, teamLead, teamMembers
- Methodology Support: agile, kanban, lean, six-sigma, waterfall
- Integrations: githubRepo, jenkinsPipeline, cloudflareZone
- Tech Stack tracking

**2. `environments`** - Dev/Staging/Production Environments
- Replaced: `systems` (compromised hosts)
- Fields: name, type, url, status, healthStatus, version
- Environment Types: development, staging, production, testing
- Deployment tracking: lastDeployment, lastHealthCheck
- Configuration management

**3. `sprints`** - Agile Sprint Management  
- New table for sprint/iteration tracking
- Fields: name, goal, sprintNumber, status
- Metrics: velocity, plannedPoints, completedPoints
- Burndown data, retrospective notes

**4. `tasks`** - Development Tasks/User Stories
- New table for Kanban/Scrum task management
- Types: feature, bug, refactor, documentation, test, chore
- Status: backlog, todo, in-progress, review, done, blocked
- Story points, time tracking (estimated vs actual hours)
- Dependencies and blocking relationships
- Assignees and reporters

**5. `issues`** - Bug/Issue Tracking
- Replaced: `vulnerabilities` (security vulns)
- Fields: title, description, type, severity, status
- Severity: critical, high, medium, low (no CVSS scores)
- Types: bug, enhancement, task, question
- Reproduction steps, expected/actual behavior
- No rewards or security-specific fields

**6. `repositories`** - Git Repository Tracking
- New table for version control integration
- Providers: GitHub, GitLab, Bitbucket
- Track: last commit, branch info, webhook configuration
- Sync status

**7. `deployments`** - Deployment History
- New table for CI/CD tracking
- Fields: version, status, deployedBy, gitCommitSha
- Deployment logs
- Rollback capabilities

**8. `pullRequests`** - Pull Request Management
- New table for code review workflow
- Track: author, reviewers, approval status
- PR number, source/target branches
- Comments count, merge status

**9. `releases`** - Software Releases
- Replaced: `reports` (pentest reports)
- Fields: version, title, releaseNotes, changelog
- Git tags, deployment status
- Breaking changes, migration guides
- AI-generated release notes support

### ✅ Retained Core Tables
- `users` - Team members and authentication
- `sessions` - Google OAuth sessions
- `aiAgents` - Development AI agents (perfect for SDLC!)
- `globalConfig` - User/system configuration

## Next Steps: Implementation Phases

### Phase B: Update Storage Layer
- [ ] Update `server/storage.ts` to support new schema
- [ ] Add methods for projects, sprints, tasks, issues
- [ ] Add methods for repositories, deployments, releases
- [ ] Remove old security-focused methods

### Phase C: Update API Routes
- [ ] Update `server/routes.ts` with new SDLC endpoints
- [ ] `/api/projects` - CRUD operations
- [ ] `/api/sprints` - Sprint management
- [ ] `/api/tasks` - Task management  
- [ ] `/api/issues` - Issue tracking
- [ ] `/api/deployments` - Deployment tracking
- [ ] `/api/repositories` - Repository integration
- [ ] Remove old `/api/operations`, `/api/beacons` endpoints

### Phase D: Transform UI Components

**Pages to Update:**
1. **Dashboard** (`client/src/pages/dashboard.tsx`)
   - Remove: "Active Programs", "Vulnerabilities", "Rewards"
   - Add: "Active Projects", "Sprint Progress", "Tasks Completed", "Deployment Status"
   - Show: Project health, team velocity, code quality metrics

2. **Projects Page** (`client/src/pages/projects.tsx`)
   - Remove: Bug bounty program cards
   - Add: Software project cards with tech stack, team size, repository links
   - Actions: View Kanban Board, Sprints, Deployments

3. **Tasks Page** (Rename from certificates or create new)
   - Create: Kanban board component
   - Columns: Backlog, To Do, In Progress, Review, Done
   - Drag & drop functionality
   - Sprint filtering

4. **Issues Page** (Transform from vulnerabilities)
   - Remove: Rewards, CVSS scores, proof of concept
   - Add: Reproduction steps, environment tracking
   - Bug workflow management

5. **Analytics Page** (`client/src/pages/analytics.tsx`)
   - Remove: Vulnerability trends, reward tracking
   - Add: Velocity charts, burndown charts, cycle time
   - Code coverage trends, deployment frequency
   - Sprint metrics, team productivity

6. **Integrations Page** (`client/src/pages/integrations.tsx`)
   - Remove: Burp Suite, Kali Linux, security tools
   - Add: GitHub, GitLab, Jenkins, GitHub Actions
   - Add: OpenTofu, Cloudflare integrations
   - Keep: OpenAI, Anthropic (AI agents)

**New Pages to Create:**
- `sprints.tsx` - Sprint management interface
- `repositories.tsx` - Git repository overview
- `deployments.tsx` - Deployment pipeline dashboard
- `releases.tsx` - Release management

**Components to Remove:**
- `vulnerability-card.tsx`
- `vulnerability-form.tsx`  
- Bug bounty-specific components

**Components to Create:**
- `project-card.tsx` - Modern software project cards
- `task-card.tsx` - Kanban task cards
- `issue-card.tsx` - Issue/bug cards
- `sprint-board.tsx` - Sprint planning interface
- `kanban-column.tsx` - Draggable Kanban columns
- `deployment-pipeline.tsx` - CI/CD pipeline visualization
- `repository-card.tsx` - Git repository cards

### Phase E: Update Terminology

**Global Search & Replace:**
- "Operation" → "Project"
- "Program" → "Project" (in UI context)
- "Vulnerability" → "Issue" or "Bug"
- "Reward" → (remove completely)
- "Security Researcher" → "Developer" or "Team Member"
- "Red Team" → (remove)
- "Penetration Test" → (remove)
- "Beacon" → (remove)
- "Compromised" → (remove)

## Integration Specifications

### GitHub Integration
- OAuth authentication
- Webhooks for: commits, pull requests, issues
- Repository sync
- GitHub Actions status monitoring

### Jenkins Integration
- Pipeline status tracking
- Build triggers
- Test results ingestion
- Deployment automation

### Cloudflare Integration
- Zone management
- DNS configuration
- CDN status

### OpenTofu Integration
- Infrastructure state tracking
- Plan/apply status
- Resource management

## AI Agents (Kept & Enhanced)
The existing AI agents are perfect for SDLC:
- **Architecture Lead** - System design, technical decisions
- **Frontend Core** - UI development, component creation
- **Backend Integration** - API development, database design
- **Quality Assurance** - Testing, quality gates
- **DevOps** - CI/CD, infrastructure, deployment
- **MCP Integration** - Model/service coordination

## Migration Strategy

### For Existing Data:
1. **Operations → Projects**: Migrate with field mapping
2. **Programs**: Delete (bug bounty specific)
3. **Vulnerabilities → Issues**: Transform (remove rewards, add dev fields)
4. **Beacons**: Delete (security specific)
5. **Systems → Environments**: Transform (deployment environments)

### Database Migration Script Needed:
```sql
-- Rename tables
ALTER TABLE operations RENAME TO projects;
ALTER TABLE systems RENAME TO environments;
ALTER TABLE vulnerabilities RENAME TO issues;
ALTER TABLE reports RENAME TO releases;

-- Drop security tables
DROP TABLE beacons CASCADE;
DROP TABLE network_discoveries CASCADE;
DROP TABLE remote_sessions CASCADE;
DROP TABLE client_certificates CASCADE;
DROP TABLE programs CASCADE;

-- Add new columns to projects
ALTER TABLE projects 
  ADD COLUMN methodology TEXT DEFAULT 'agile',
  ADD COLUMN team_size TEXT DEFAULT 'small',
  ADD COLUMN tech_stack JSONB DEFAULT '[]',
  ADD COLUMN github_repo TEXT,
  ADD COLUMN jenkins_pipeline TEXT,
  ADD COLUMN cloudflare_zone TEXT,
  DROP COLUMN type,
  DROP COLUMN codename,
  DROP COLUMN rules_of_engagement,
  DROP COLUMN scope,
  DROP COLUMN client_contact;
```

## Timeline Estimate
- **Phase A** (Schema): ✅ Complete
- **Phase B** (Storage Layer): 2-3 hours
- **Phase C** (API Routes): 2-3 hours
- **Phase D** (UI Components): 6-8 hours
- **Phase E** (Integrations): 4-6 hours
- **Testing & Polish**: 2-3 hours

**Total**: 16-23 hours of development

## Success Criteria
- ✅ All bug bounty/security terminology removed
- ✅ SDLC-appropriate features implemented
- ✅ Kanban board functional
- ✅ Sprint management working
- ✅ GitHub/Jenkins integrations active
- ✅ AI agents integrated with development workflow
- ✅ Clean, modern developer-focused UI
