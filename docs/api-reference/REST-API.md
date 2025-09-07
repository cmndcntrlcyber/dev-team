# REST API Reference

The Dev Team Platform provides a comprehensive REST API for programmatic access to all platform features. This reference covers authentication, endpoints, request/response formats, and examples.

## 🔗 Base URL

```
http://localhost:3000/api/v1
```

For production deployments, replace `localhost:3000` with your domain.

## 🔐 Authentication

### JWT Token Authentication
All API requests require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Login and Token Management

#### POST /auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "admin@devteam.local",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 900,
    "user": {
      "id": "user_id",
      "email": "admin@devteam.local",
      "name": "Admin User",
      "role": "admin"
    }
  }
}
```

#### POST /auth/refresh
Refresh expired JWT token using refresh token.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### POST /auth/logout
Invalidate current session and tokens.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

## 📋 Projects API

### GET /projects
List all projects with optional filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (`active`, `completed`, `paused`)
- `template` (string): Filter by template type
- `search` (string): Search in project names and descriptions

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/projects?page=1&limit=10&status=active"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "proj_123",
        "name": "My React App",
        "description": "A full-stack React application",
        "status": "active",
        "template": "react-app",
        "progress": 65,
        "createdAt": "2025-01-06T10:00:00Z",
        "updatedAt": "2025-01-06T15:30:00Z",
        "estimatedCompletion": "2025-01-08T10:00:00Z",
        "activeAgents": ["architecture-lead-001", "frontend-core-001"],
        "technologies": ["React", "TypeScript", "Express.js", "PostgreSQL"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### POST /projects
Create a new project.

**Request:**
```json
{
  "name": "E-commerce Platform",
  "description": "Full-featured online store with admin panel",
  "template": "react-app",
  "technologies": ["React", "Node.js", "PostgreSQL"],
  "configuration": {
    "targetEnvironment": "production",
    "qualityGates": {
      "testCoverage": 90,
      "codeQuality": 8.0
    },
    "deploymentOptions": {
      "autoDeploy": false,
      "platform": "aws"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "proj_124",
      "name": "E-commerce Platform",
      "status": "initializing",
      "progress": 0,
      "createdAt": "2025-01-06T16:00:00Z",
      "tasks": []
    }
  }
}
```

### GET /projects/{projectId}
Get detailed information about a specific project.

**Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "proj_123",
      "name": "My React App",
      "description": "A full-stack React application",
      "status": "active",
      "progress": 65,
      "files": [
        {
          "path": "src/components/App.tsx",
          "size": 2048,
          "lastModified": "2025-01-06T14:30:00Z"
        }
      ],
      "tasks": [
        {
          "id": "task_456",
          "title": "Create user authentication system",
          "status": "in_progress",
          "assignedAgent": "backend-integration-001",
          "estimatedTime": 120,
          "dependencies": []
        }
      ],
      "metrics": {
        "linesOfCode": 1250,
        "testCoverage": 85.5,
        "codeQualityScore": 8.2
      }
    }
  }
}
```

### PUT /projects/{projectId}
Update project configuration and settings.

### DELETE /projects/{projectId}
Delete a project and all associated data.

### POST /projects/{projectId}/start
Start or resume project development.

### POST /projects/{projectId}/pause
Pause active project development.

### GET /projects/{projectId}/files
List project files with optional path filtering.

**Query Parameters:**
- `path` (string): Filter files by path prefix
- `extension` (string): Filter by file extension

### GET /projects/{projectId}/files/{filePath}
Download or view specific project file content.

## 🎯 Tasks API

### GET /tasks
List tasks across all projects or for specific project.

**Query Parameters:**
- `projectId` (string): Filter by project
- `status` (string): Filter by status
- `assignedAgent` (string): Filter by assigned agent
- `priority` (string): Filter by priority level

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_456",
        "title": "Create user authentication system",
        "description": "Implement JWT-based authentication with refresh tokens",
        "status": "in_progress",
        "priority": "high",
        "projectId": "proj_123",
        "assignedAgent": "backend-integration-001",
        "estimatedTime": 120,
        "actualTime": 75,
        "dependencies": ["task_123", "task_234"],
        "createdAt": "2025-01-06T10:00:00Z",
        "startedAt": "2025-01-06T11:00:00Z",
        "dueDate": "2025-01-07T10:00:00Z"
      }
    ]
  }
}
```

### POST /tasks
Create a new task (typically done by Architecture Lead Agent).

### GET /tasks/{taskId}
Get detailed task information including logs and progress.

### PUT /tasks/{taskId}
Update task status, priority, or assignment.

### POST /tasks/{taskId}/assign
Assign task to a specific agent.

**Request:**
```json
{
  "agentId": "frontend-core-001",
  "priority": "high",
  "dueDate": "2025-01-07T16:00:00Z"
}
```

## 🤖 Agents API

### GET /agents
List all available agents with their current status.

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "architecture-lead-001",
        "type": "ARCHITECTURE_LEAD",
        "status": "online",
        "currentTask": "task_456",
        "queueSize": 3,
        "performance": {
          "tasksCompleted": 125,
          "successRate": 96.8,
          "averageTaskTime": 45.5
        },
        "capabilities": [
          "project_planning",
          "technology_selection",
          "code_review"
        ],
        "lastActive": "2025-01-06T16:28:00Z"
      }
    ]
  }
}
```

### GET /agents/{agentId}
Get detailed information about specific agent.

### GET /agents/{agentId}/status
Get real-time agent status and current activity.

### POST /agents/{agentId}/command
Send command to specific agent.

**Request:**
```json
{
  "type": "TASK_ASSIGNMENT",
  "payload": {
    "taskId": "task_789",
    "priority": "high",
    "instructions": "Focus on performance optimization"
  }
}
```

### GET /agents/{agentId}/metrics
Get performance metrics and analytics for specific agent.

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "tasksCompletedToday": 8,
      "tasksCompletedWeek": 45,
      "averageTaskTime": 42.5,
      "successRate": 97.2,
      "errorRate": 2.8,
      "performance": {
        "trend": "improving",
        "efficiency": 85.3
      },
      "recentTasks": [
        {
          "taskId": "task_456",
          "completedAt": "2025-01-06T15:45:00Z",
          "duration": 38,
          "status": "completed"
        }
      ]
    }
  }
}
```

## 📊 Analytics API

### GET /analytics/overview
Get platform-wide analytics and metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProjects": 25,
      "activeProjects": 8,
      "completedProjects": 17,
      "totalTasks": 456,
      "completedTasks": 389,
      "averageProjectDuration": 5.2,
      "systemHealth": {
        "services": 13,
        "servicesHealthy": 13,
        "agents": 6,
        "agentsOnline": 6
      }
    }
  }
}
```

### GET /analytics/projects/{projectId}
Get detailed analytics for specific project.

### GET /analytics/agents
Get analytics across all agents.

### GET /analytics/performance
Get system performance metrics.

## 🔔 Notifications API

### GET /notifications
Get user notifications with filtering options.

**Query Parameters:**
- `unread` (boolean): Filter unread notifications
- `type` (string): Filter by notification type
- `limit` (number): Number of notifications to return

### POST /notifications/mark-read
Mark notifications as read.

**Request:**
```json
{
  "notificationIds": ["notif_123", "notif_456"]
}
```

### GET /notifications/settings
Get user notification preferences.

### PUT /notifications/settings
Update notification preferences.

## 📁 Templates API

### GET /templates
List available project templates.

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "react-app",
        "name": "React Application",
        "description": "Full-stack React application with Express.js backend",
        "technologies": ["React", "TypeScript", "Express.js", "PostgreSQL"],
        "estimatedTime": "4-6 hours",
        "complexity": "medium",
        "phases": [
          "Architecture Planning",
          "Frontend Development",
          "Backend Development",
          "Testing & QA",
          "Deployment Setup"
        ]
      }
    ]
  }
}
```

### GET /templates/{templateId}
Get detailed template information and configuration options.

## 🔧 System API

### GET /health
System health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-06T16:30:00Z",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "nats": "healthy",
      "agents": "healthy"
    },
    "version": "1.0.0",
    "uptime": 86400
  }
}
```

### GET /metrics
Get system metrics (requires admin role).

### GET /logs
Get system logs with filtering (requires admin role).

**Query Parameters:**
- `level` (string): Filter by log level
- `service` (string): Filter by service name
- `limit` (number): Number of log entries
- `since` (string): ISO timestamp to filter from

## 📡 WebSocket Events

Connect to `ws://localhost:3000/ws` for real-time updates.

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
ws.addEventListener('open', () => {
  // Send authentication
  ws.send(JSON.stringify({
    type: 'AUTH',
    token: 'your_jwt_token'
  }));
});
```

### Event Types

#### Project Updates
```json
{
  "type": "PROJECT_UPDATE",
  "projectId": "proj_123",
  "data": {
    "progress": 70,
    "status": "active",
    "lastModified": "2025-01-06T16:30:00Z"
  }
}
```

#### Task Updates
```json
{
  "type": "TASK_UPDATE",
  "taskId": "task_456",
  "data": {
    "status": "completed",
    "completedAt": "2025-01-06T16:30:00Z",
    "duration": 45
  }
}
```

#### Agent Status
```json
{
  "type": "AGENT_STATUS",
  "agentId": "frontend-core-001",
  "data": {
    "status": "busy",
    "currentTask": "task_789",
    "queueSize": 2
  }
}
```

#### Human Approval Required
```json
{
  "type": "APPROVAL_REQUIRED",
  "projectId": "proj_123",
  "data": {
    "decisionType": "architecture",
    "title": "Choose CSS Framework",
    "options": ["Tailwind CSS", "Material-UI", "Styled Components"],
    "context": "Frontend agent needs to choose styling approach"
  }
}
```

## 🚨 Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid project configuration",
    "details": {
      "field": "technologies",
      "reason": "At least one technology must be specified"
    }
  }
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED` (401): Missing or invalid token
- `AUTHORIZATION_FAILED` (403): Insufficient permissions
- `RESOURCE_NOT_FOUND` (404): Requested resource doesn't exist
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server-side error

## 📈 Rate Limiting

API requests are rate limited per user:
- **Standard Users**: 100 requests/minute
- **Admin Users**: 500 requests/minute
- **Service Accounts**: 1000 requests/minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641484800
```

## 📝 Examples

### Complete Project Creation Flow

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@devteam.local","password":"admin123"}' \
  | jq -r '.data.token')

# 2. Create project
PROJECT_ID=$(curl -s -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Project",
    "template": "react-app",
    "description": "REST API with React frontend"
  }' | jq -r '.data.project.id')

# 3. Start project
curl -X POST http://localhost:3000/api/v1/projects/$PROJECT_ID/start \
  -H "Authorization: Bearer $TOKEN"

# 4. Monitor progress
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/projects/$PROJECT_ID
```

### JavaScript/TypeScript SDK Example

```typescript
import { DevTeamClient } from '@devteam/sdk';

const client = new DevTeamClient({
  baseURL: 'http://localhost:3000',
  apiKey: 'your_api_key'
});

// Create and start project
const project = await client.projects.create({
  name: 'E-commerce Site',
  template: 'react-app',
  technologies: ['React', 'Express', 'PostgreSQL']
});

// Monitor progress with WebSocket
const ws = client.realtime.connect();
ws.subscribe('PROJECT_UPDATE', project.id, (update) => {
  console.log(`Project ${project.id} is ${update.progress}% complete`);
});

// List all agents
const agents = await client.agents.list();
console.log(`${agents.length} agents available`);
```

## 🔗 SDK Libraries

Official SDK libraries are available for:
- **JavaScript/TypeScript**: `npm install @devteam/sdk`
- **Python**: `pip install devteam-sdk`
- **Go**: `go get github.com/devteam/go-sdk`
- **Java**: Maven/Gradle packages available

## 📚 Additional Resources

- **OpenAPI Specification**: `http://localhost:3000/api-docs`
- **Postman Collection**: [Download here](../assets/devteam-postman-collection.json)
- **Interactive API Explorer**: `http://localhost:3000/api-explorer`
- **WebSocket Testing Tool**: `http://localhost:3000/ws-tester`

---

**Need Help?**
- [Authentication Guide](AUTHENTICATION.md)
- [WebSocket Events](WEBSOCKET-EVENTS.md)
- [Common Issues](../troubleshooting/COMMON-ISSUES.md)
