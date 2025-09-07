# Dashboard Guide

The Dev Team Platform Dashboard is your command center for managing AI-powered development projects. This guide covers every feature of the web interface.

## 🚀 Accessing the Dashboard

1. **URL**: `http://localhost:3080` (after starting the platform)
2. **Default Login**:
   - Email: `admin@devteam.local`
   - Password: `admin123`
3. **Change Password**: Go to Profile → Settings after first login

## 📊 Dashboard Overview

The main dashboard consists of several key sections:

### Navigation Bar
- **🏠 Home**: Main dashboard view
- **📋 Projects**: Project management interface
- **🤖 Agents**: AI agent status and management
- **📈 Analytics**: Performance metrics and insights
- **👤 Profile**: User settings and account management

### Main Dashboard Panels

#### Project Overview Panel
Shows your active projects with:
- **Project Status**: In Progress, Completed, Paused
- **Progress Percentage**: Overall completion status
- **Active Agents**: Which AI agents are currently working
- **Timeline**: Estimated completion dates
- **Quick Actions**: Start, Pause, Review, Deploy

#### System Health Panel
Real-time monitoring of:
- **Service Status**: All 13 services (Green/Yellow/Red)
- **Agent Availability**: Which agents are online
- **Database Health**: Connection status
- **Memory Usage**: System resource utilization
- **Active Tasks**: Current workload

#### Recent Activity Feed
- Agent actions and decisions
- Project milestones reached
- Quality gate results
- User interactions and approvals
- System notifications

## 📋 Projects Section

### Project List View
- **Project Cards**: Visual representation of each project
- **Filter Options**: By status, template, creation date
- **Sort Options**: Name, date, progress, priority
- **Search**: Find projects by name or technology

### Creating a New Project

1. **Click "New Project"** button
2. **Choose Template**:
   - **React App**: Full-stack React application
   - **MCP Server**: Model Context Protocol server
   - **Custom**: Define your own requirements

3. **Configure Project**:
   ```
   Project Name: [Enter descriptive name]
   Description: [Brief project overview]
   Template: [Selected template]
   Technologies: [Auto-selected or custom]
   Repository: [Optional Git repository URL]
   ```

4. **Advanced Settings** (Optional):
   - **Target Environment**: Development, Staging, Production
   - **Quality Gates**: Test coverage requirements
   - **Agent Preferences**: Specific agent configurations
   - **Deployment Options**: Auto-deploy settings

5. **Create Project**: Review settings and confirm

### Project Details View

When you click on a project, you see:

#### Project Header
- **Project Name** and description
- **Status Badge**: Current project state
- **Progress Bar**: Overall completion percentage
- **Action Buttons**: Edit, Clone, Archive, Delete

#### Task Board (Kanban Style)
- **Backlog**: Pending tasks
- **In Progress**: Currently active tasks
- **Review**: Tasks awaiting human approval
- **Testing**: Quality assurance phase
- **Completed**: Finished tasks

Each task shows:
- Task title and description
- Assigned agent
- Priority level
- Dependencies
- Time estimates

#### Agent Activity Timeline
- Real-time feed of agent actions
- Decision points requiring human input
- Code commits and file changes
- Quality gate results
- Deployment activities

#### Files and Code View
- **File Tree**: Project structure
- **Code Preview**: View generated code
- **Change History**: Git-like version history
- **Download**: Export project files

## 🤖 Agents Section

### Agent Grid View
6 agent cards showing:
- **Agent Type**: Architecture, Frontend, Backend, QA, DevOps, MCP
- **Status**: Online, Busy, Offline, Error
- **Current Task**: What the agent is working on
- **Performance**: Success rate and average task time
- **Queue Size**: Number of pending tasks

### Individual Agent Details

Click any agent to see:

#### Agent Status Panel
- **Health Status**: System status indicators
- **Current Activity**: Real-time task information
- **Performance Metrics**: 
  - Tasks completed today/week
  - Average task completion time
  - Success rate percentage
  - Error rate and common issues

#### Capabilities Overview
- **Primary Skills**: What this agent specializes in
- **Technologies**: Supported frameworks and tools
- **Integration Points**: How it works with other agents
- **Configuration Options**: Customizable settings

#### Task History
- **Recent Tasks**: Last 50 completed tasks
- **Performance Trends**: Time-series graphs
- **Error Log**: Failed tasks and reasons
- **Learning Insights**: How the agent is improving

### Agent Management

#### Configuration Settings
```
Agent Settings:
├── Skill Level: Beginner | Intermediate | Expert
├── Timeout Settings: Task timeout in seconds
├── Concurrency: Max simultaneous tasks
├── Quality Threshold: Minimum acceptance criteria
└── Integration Preferences: How to work with other agents
```

#### Scaling Options
- **Horizontal Scaling**: Add more instances of the same agent
- **Load Balancing**: Distribute tasks across agent instances
- **Priority Queue**: Configure task prioritization
- **Resource Limits**: Set memory and CPU constraints

## 📈 Analytics Section

### Project Analytics

#### Progress Tracking
- **Timeline View**: Gantt chart of project phases
- **Velocity Charts**: Task completion rates over time
- **Burndown Charts**: Remaining work vs. time
- **Milestone Tracking**: Key deliverable progress

#### Quality Metrics
- **Code Quality Scores**: Static analysis results
- **Test Coverage**: Percentage of code tested
- **Security Scans**: Vulnerability assessments
- **Performance Benchmarks**: Speed and efficiency metrics

#### Resource Utilization
- **Agent Workload**: Distribution across agents
- **System Resources**: CPU, memory, disk usage
- **API Usage**: Claude API calls and costs
- **Database Performance**: Query times and connections

### System Analytics

#### Service Health Dashboard
- **Uptime Statistics**: Service availability over time
- **Response Times**: API endpoint performance
- **Error Rates**: Failed requests and reasons
- **Throughput**: Requests per minute/hour

#### Agent Performance
- **Task Success Rates**: By agent and task type
- **Average Completion Times**: Performance trends
- **Collaboration Efficiency**: Inter-agent coordination
- **Learning Curves**: Agent improvement over time

## 🔔 Notifications & Alerts

### Notification Types

#### Project Notifications
- **Milestone Reached**: Project phases completed
- **Human Approval Needed**: Decision points requiring input
- **Quality Gate Failed**: Issues requiring attention
- **Deployment Ready**: Project ready for deployment

#### System Notifications
- **Agent Errors**: AI agent failures or issues
- **Service Outages**: Infrastructure problems
- **Security Alerts**: Potential security issues
- **Resource Warnings**: High CPU/memory usage

### Notification Settings
Configure in Profile → Notifications:
- **Email Notifications**: Critical alerts via email
- **Browser Notifications**: Real-time browser alerts
- **Slack Integration**: Send alerts to Slack channels
- **Webhook URLs**: Custom notification endpoints

## ⚙️ User Settings

### Profile Management
- **Personal Information**: Name, email, timezone
- **Password Change**: Update authentication
- **API Keys**: Manage personal API tokens
- **Preferences**: Dashboard layout and themes

### Team Management (Admin Only)
- **User Accounts**: Add/remove team members
- **Role Permissions**: Define access levels
- **Project Access**: Control project visibility
- **Audit Log**: Track user actions

### System Configuration (Admin Only)
- **Service Settings**: Configure microservices
- **Agent Configuration**: Global agent settings
- **Integration Settings**: External service configs
- **Backup Settings**: Data backup configurations

## 🎨 Customization Options

### Dashboard Layout
- **Widget Arrangement**: Drag-and-drop dashboard panels
- **Theme Selection**: Light/Dark mode
- **Color Schemes**: Customize brand colors
- **Panel Sizes**: Adjust information density

### Project Views
- **List vs. Grid**: Choose project display style
- **Sorting Options**: Customize default sorting
- **Filter Presets**: Save common filter combinations
- **Column Selection**: Choose which data to display

### Agent Display
- **Monitoring Level**: Basic, Detailed, or Debug
- **Refresh Rate**: How often to update status
- **Alert Thresholds**: When to show warnings
- **History Length**: How much history to keep

## 🔧 Troubleshooting Dashboard Issues

### Common Issues

#### Dashboard Won't Load
1. **Check URL**: Ensure you're using `http://localhost:3080`
2. **Clear Browser Cache**: Hard refresh with Ctrl+Shift+R
3. **Try Incognito Mode**: Rule out browser extensions
4. **Check Service Status**: `docker-compose ps`

#### Login Issues
1. **Verify Credentials**: Default is `admin@devteam.local` / `admin123`
2. **Check Auth Service**: `curl http://localhost:3004/health`
3. **Reset Password**: Use the "Forgot Password" link
4. **Clear Cookies**: Remove old session data

#### Slow Performance
1. **Check System Resources**: `docker stats`
2. **Reduce Refresh Rate**: Lower update frequency
3. **Close Unused Browser Tabs**: Free up memory
4. **Restart Services**: `docker-compose restart frontend`

#### Missing Data
1. **Check Database Connection**: Service health panel
2. **Verify Agent Status**: Ensure agents are running
3. **Refresh Page**: Force data reload
4. **Check Browser Console**: Look for JavaScript errors

### Getting Help
- **Built-in Help**: Click the (?) icons for tooltips
- **Status Page**: Check system health indicators
- **Log Viewer**: Built-in log access for debugging
- **Export Diagnostics**: Download system information for support

## 🚀 Advanced Features

### Custom Dashboards
Create personalized views:
- **Widget Selection**: Choose relevant information
- **Layout Customization**: Arrange panels optimally
- **Data Filtering**: Focus on specific projects or agents
- **Export Options**: Save views as PDFs or images

### API Integration
Access dashboard data programmatically:
- **REST Endpoints**: Full API access to dashboard data
- **WebSocket Events**: Real-time data streaming
- **Custom Widgets**: Build your own dashboard components
- **Third-party Tools**: Integrate with external monitoring

### Automation Rules
Set up automatic actions:
- **Auto-approve**: Certain types of decisions
- **Alert Escalation**: Notify managers for critical issues
- **Deployment Pipelines**: Automatic deployment on completion
- **Backup Triggers**: Schedule automatic backups

---

## 🎯 Dashboard Best Practices

1. **Regular Monitoring**: Check dashboard at least daily
2. **Customize for Your Workflow**: Arrange panels by importance
3. **Use Filters**: Focus on relevant information
4. **Set Appropriate Alerts**: Avoid notification fatigue
5. **Review Analytics**: Learn from project patterns
6. **Keep Agents Healthy**: Monitor agent performance
7. **Plan for Scaling**: Monitor resource usage trends

**Need More Help?** → [Common Issues](../troubleshooting/COMMON-ISSUES.md) | [API Reference](../api-reference/REST-API.md)
