import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StatsCard from "@/components/stats-card";
import AiAgentStatus from "@/components/ai-agent-status";
import { Briefcase, CheckSquare, Bug, Rocket, Plus, Bell, Info, GitBranch } from "lucide-react";
import TaskDialog from "@/components/dialogs/task-dialog";
import StatsSkeleton from "@/components/ui/stats-skeleton";

export default function Dashboard() {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["/api/issues"],
  });

  const { data: aiAgents = [] } = useQuery({
    queryKey: ["/api/ai-agents"],
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["/api/dashboard/activity"],
  });

  const activeProjects = projects.filter((p: any) => p.status === 'active').slice(0, 5);
  const recentTasks = tasks.slice(0, 5);
  const agentsList = aiAgents.slice(0, 6);

  const handleMarkAllAsRead = () => {
    setUnreadNotifications(0);
  };

  const handleNotificationClick = (notificationId: number) => {
    console.log('Notification clicked:', notificationId);
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-dark">
        <header className="bg-surface border-b border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Dashboard</h2>
            <p className="text-gray-400 mt-1">Welcome back, Developer</p>
          </div>
        </header>
        <main className="p-6">
          <StatsSkeleton count={4} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Dashboard</h2>
            <p className="text-gray-400 mt-1">Welcome back, Developer</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => setTaskDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative">
                  <Button variant="outline" size="icon" className="bg-card border-gray-600 text-gray-100 hover:bg-gray-700">
                    <Bell className="h-4 w-4" />
                  </Button>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-2 -right-2 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-96 bg-surface border-gray-700" align="end">
                <DropdownMenuLabel className="flex items-center justify-between p-4 pb-2">
                  <span className="text-lg font-semibold text-gray-100">Notifications</span>
                  {unreadNotifications > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-primary hover:text-primary/80 p-0 h-auto"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notification: any) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="p-4 cursor-pointer hover:bg-card focus:bg-card"
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="flex items-start space-x-3 w-full">
                          <Info className="h-5 w-5 mt-0.5 text-primary" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-gray-100">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-medium">
              DV
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Active Projects"
            value={(stats as any)?.activeProjects || 0}
            icon={Briefcase}
            trend="+2 this month"
            iconColor="text-primary"
          />
          <StatsCard
            title="Total Tasks"
            value={(stats as any)?.totalTasks || 0}
            icon={CheckSquare}
            trend="12 completed this week"
            iconColor="text-success"
          />
          <StatsCard
            title="Open Issues"
            value={(stats as any)?.totalIssues || 0}
            icon={Bug}
            trend={`${(stats as any)?.resolvedIssues || 0} resolved`}
            iconColor="text-warning"
          />
          <StatsCard
            title="Deployments"
            value={(stats as any)?.totalDeployments || 0}
            icon={Rocket}
            trend={`${(stats as any)?.successfulDeployments || 0} successful`}
            iconColor="text-blue-400"
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Active Projects */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-100">
                  Active Projects
                </CardTitle>
                <Button variant="link" className="text-primary hover:text-primary/80 p-0">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No active projects. Create your first project to get started.
                  </div>
                ) : (
                  activeProjects.map((project: any) => (
                    <div key={project.id} className="bg-card rounded-lg p-3 hover:bg-gray-800 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-100">{project.name}</h4>
                        <Badge className="bg-success/20 text-success">
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        {project.methodology && (
                          <span>{project.methodology}</span>
                        )}
                        {project.repositoryUrl && (
                          <div className="flex items-center">
                            <GitBranch className="h-3 w-3 mr-1" />
                            Repo Linked
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Agent Status */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-100">
                  AI Development Agents
                </CardTitle>
                <Button variant="link" className="text-primary hover:text-primary/80 p-0">
                  Configure
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentsList.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No AI agents configured. Set up agents in Settings.
                  </div>
                ) : (
                  agentsList.map((agent: any) => (
                    <AiAgentStatus key={agent.id} agent={agent} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task & Issue Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Status Distribution */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100">
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(stats as any)?.tasksByStatus?.map((statusGroup: any) => (
                  <div key={statusGroup.status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 capitalize">
                      {statusGroup.status.replace('-', ' ')}
                    </span>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-700 rounded-full mr-3">
                        <div 
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (statusGroup.count / 10) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-300 w-8 text-right">{statusGroup.count}</span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-400">
                    No task data available.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Issue Severity Distribution */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100">
                Issue Severity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(stats as any)?.issuesBySeverity?.map((severityGroup: any) => (
                  <div key={severityGroup.severity} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 capitalize">
                      {severityGroup.severity}
                    </span>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-700 rounded-full mr-3">
                        <div 
                          className={`h-2 rounded-full ${
                            severityGroup.severity === 'critical' ? 'bg-error' :
                            severityGroup.severity === 'high' ? 'bg-warning' :
                            severityGroup.severity === 'medium' ? 'bg-blue-400' : 'bg-success'
                          }`}
                          style={{ width: `${Math.min(100, (severityGroup.count / 10) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-300 w-8 text-right">{severityGroup.count}</span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-400">
                    No issue data available.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        mode="create"
      />
    </div>
  );
}
