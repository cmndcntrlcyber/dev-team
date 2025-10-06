import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, Server, CheckCircle, XCircle, Clock, GitCommit, User, RotateCcw, FileText, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Deployment, Environment, Project } from "@shared/schema";
import DeploymentDialog from "@/components/dialogs/deployment-dialog";
import StatsSkeleton from "@/components/ui/stats-skeleton";

export default function Deployments() {
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterEnvironment, setFilterEnvironment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | undefined>();

  const { data: deployments = [], isLoading } = useQuery({
    queryKey: ["/api/deployments"],
  });

  const { data: environments = [] } = useQuery({
    queryKey: ["/api/environments"],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const filteredDeployments = deployments.filter((deployment: Deployment) => {
    const matchesProject = filterProject === "all" || deployment.projectId === parseInt(filterProject);
    const matchesEnvironment = filterEnvironment === "all" || deployment.environmentId === parseInt(filterEnvironment);
    const matchesStatus = filterStatus === "all" || deployment.status === filterStatus;
    
    return matchesProject && matchesEnvironment && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-error" />;
      case "deploying":
        return <Clock className="h-4 w-4 text-warning animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-success/20 text-success">Success</Badge>;
      case "failed":
        return <Badge className="bg-error/20 text-error">Failed</Badge>;
      case "deploying":
        return <Badge className="bg-warning/20 text-warning">Deploying</Badge>;
      case "rolled-back":
        return <Badge className="bg-gray-500/20 text-gray-400">Rolled Back</Badge>;
      default:
        return <Badge className="bg-gray-700 text-gray-300">Pending</Badge>;
    }
  };

  const getEnvironmentBadge = (type: string) => {
    switch (type) {
      case "production":
        return <Badge className="bg-error/20 text-error">Production</Badge>;
      case "staging":
        return <Badge className="bg-warning/20 text-warning">Staging</Badge>;
      case "development":
        return <Badge className="bg-success/20 text-success">Development</Badge>;
      default:
        return <Badge className="bg-gray-700 text-gray-300">{type}</Badge>;
    }
  };

  // Calculate stats
  const totalDeployments = deployments.length;
  const successfulDeployments = deployments.filter((d: Deployment) => d.status === "success").length;
  const failedDeployments = deployments.filter((d: Deployment) => d.status === "failed").length;
  const successRate = totalDeployments > 0 ? Math.round((successfulDeployments / totalDeployments) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark">
        <header className="bg-surface border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Deployments</h2>
              <p className="text-gray-400 mt-1">Track deployment history and pipeline status</p>
            </div>
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
            <h2 className="text-2xl font-bold text-gray-100">Deployments</h2>
            <p className="text-gray-400 mt-1">Track deployment history and pipeline status</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => {
              setSelectedDeployment(undefined);
              setDialogOpen(true);
            }}
          >
            <Rocket className="h-4 w-4 mr-2" />
            New Deployment
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Deployments</p>
                  <p className="text-2xl font-bold text-gray-100 mt-1">{totalDeployments}</p>
                </div>
                <Rocket className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Successful</p>
                  <p className="text-2xl font-bold text-success mt-1">{successfulDeployments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Failed</p>
                  <p className="text-2xl font-bold text-error mt-1">{failedDeployments}</p>
                </div>
                <XCircle className="h-8 w-8 text-error" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-100 mt-1">{successRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-surface border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-48 bg-card border-gray-600 text-gray-100">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterEnvironment} onValueChange={setFilterEnvironment}>
                <SelectTrigger className="w-48 bg-card border-gray-600 text-gray-100">
                  <SelectValue placeholder="All Environments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  {environments.map((env: any) => (
                    <SelectItem key={env.id} value={env.id.toString()}>
                      {env.name} ({env.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48 bg-card border-gray-600 text-gray-100">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="deploying">Deploying</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rolled-back">Rolled Back</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Deployments Timeline */}
        {filteredDeployments.length === 0 ? (
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-100 mb-2">No Deployments Found</h3>
                <p className="text-gray-400 mb-6">
                  {filterProject !== "all" || filterEnvironment !== "all" || filterStatus !== "all"
                    ? "No deployments match your filter criteria."
                    : "No deployments recorded yet. Create your first deployment to get started."}
                </p>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    setSelectedDeployment(undefined);
                    setDialogOpen(true);
                  }}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Create Deployment
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100">Deployment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredDeployments.map((deployment: Deployment) => {
                  const project = projects.find((p: any) => p.id === deployment.projectId);
                  const environment = environments.find((e: any) => e.id === deployment.environmentId);
                  
                  return (
                    <Card 
                      key={deployment.id} 
                      className="bg-card border-gray-600 hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedDeployment(deployment);
                        setDialogOpen(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3">
                            {getStatusIcon(deployment.status)}
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold text-gray-100">
                                  {project?.name || 'Unknown Project'} v{deployment.version}
                                </h4>
                                {environment && getEnvironmentBadge(environment.type)}
                              </div>
                              <p className="text-sm text-gray-400">{environment?.name || 'Unknown Environment'}</p>
                            </div>
                          </div>
                          {getStatusBadge(deployment.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          {deployment.gitCommitSha && (
                            <div className="flex items-center text-gray-400">
                              <GitCommit className="h-4 w-4 mr-2" />
                              <code className="text-xs">{deployment.gitCommitSha.substring(0, 7)}</code>
                            </div>
                          )}
                          <div className="flex items-center text-gray-400">
                            <Clock className="h-4 w-4 mr-2" />
                            <span className="text-xs">
                              {deployment.startedAt && formatDistanceToNow(new Date(deployment.startedAt), { addSuffix: true })}
                            </span>
                          </div>
                          {deployment.completedAt && deployment.startedAt && (
                            <div className="flex items-center text-gray-400">
                              <span className="text-xs">
                                Duration: {Math.round((new Date(deployment.completedAt).getTime() - new Date(deployment.startedAt).getTime()) / 1000)}s
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                          <div className="flex items-center space-x-2">
                            {deployment.deploymentLog && (
                              <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                                <FileText className="h-3 w-3 mr-1" />
                                View Logs
                              </Button>
                            )}
                          </div>
                          {deployment.rollbackAvailable && deployment.status === "success" && (
                            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Rollback
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Deployment Dialog */}
      <DeploymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deployment={selectedDeployment}
        mode={selectedDeployment ? "edit" : "create"}
      />
    </div>
  );
}
