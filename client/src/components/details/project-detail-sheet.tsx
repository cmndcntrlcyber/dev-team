import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Project } from "@shared/schema";
import { 
  Edit, 
  Trash2, 
  Calendar, 
  Users, 
  GitBranch,
  Code,
  CheckSquare,
  Briefcase
} from "lucide-react";
import { format } from "date-fns";

interface ProjectDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number | null;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ProjectDetailSheet({ 
  open, 
  onOpenChange, 
  projectId, 
  onEdit,
  onDelete 
}: ProjectDetailSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: open && !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    select: (data: any) => data.filter((t: any) => t.projectId === projectId)
  });

  const { data: repositories = [] } = useQuery({
    queryKey: ["/api/repositories"],
    select: (data: any) => data.filter((r: any) => r.projectId === projectId)
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success";
      case "planning":
        return "bg-blue-500/20 text-blue-400";
      case "maintenance":
        return "bg-warning/20 text-warning";
      case "archived":
        return "bg-gray-500/20 text-gray-400";
      case "on-hold":
        return "bg-orange-500/20 text-orange-400";
      default:
        return "bg-gray-700 text-gray-300";
    }
  };

  const getTeamSizeLabel = (size: string) => {
    switch (size) {
      case "small":
        return "1-5 members";
      case "medium":
        return "6-15 members";
      case "large":
        return "16+ members";
      default:
        return size;
    }
  };

  if (!project) {
    return null;
  }

  const projectData = project as any;

  const taskStats = {
    total: tasks.length,
    backlog: tasks.filter((t: any) => t.status === "backlog").length,
    inProgress: tasks.filter((t: any) => t.status === "in-progress").length,
    done: tasks.filter((t: any) => t.status === "done").length,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] bg-surface border-gray-700 overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                  {projectData.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <SheetTitle className="text-2xl text-gray-100">
                    {projectData.name}
                  </SheetTitle>
                  <SheetDescription className="text-gray-400 mt-1">
                    {projectData.methodology} • {getTeamSizeLabel(projectData.teamSize || "small")}
                  </SheetDescription>
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex gap-2 mt-4">
            <Badge className={getStatusColor(projectData.status)}>
              {projectData.status}
            </Badge>
            {projectData.repositoryUrl && (
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                <GitBranch className="h-3 w-3 mr-1" />
                Repository Linked
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onEdit}
            className="flex-1 border-gray-600 text-gray-300"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
          
          <Button
            variant="destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>

        <Separator className="my-6 bg-gray-700" />

        {/* Content Tabs */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="bg-card border border-gray-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Tasks ({taskStats.total})
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Description */}
            {projectData.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
                <p className="text-gray-300">{projectData.description}</p>
              </div>
            )}

            {/* Task Statistics */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Task Progress</h3>
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-card border-gray-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-gray-100">{taskStats.total}</div>
                    <div className="text-xs text-gray-400 mt-1">Total Tasks</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-gray-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-warning">{taskStats.inProgress}</div>
                    <div className="text-xs text-gray-400 mt-1">In Progress</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-gray-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-success">{taskStats.done}</div>
                    <div className="text-xs text-gray-400 mt-1">Completed</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-gray-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-gray-400">{taskStats.backlog}</div>
                    <div className="text-xs text-gray-400 mt-1">Backlog</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tech Stack */}
            {projectData.techStack && projectData.techStack.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {projectData.techStack.map((tech: string, index: number) => (
                    <Badge key={index} variant="secondary" className="bg-gray-700 text-gray-300">
                      <Code className="h-3 w-3 mr-1" />
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks in this project yet</p>
                </div>
              ) : (
                tasks.map((task: any) => (
                  <Card key={task.id} className="bg-card border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-100">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {task.type}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {task.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Team Lead */}
              {projectData.teamLead && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-400">
                    <Users className="h-4 w-4 mr-2" />
                    Team Lead
                  </div>
                  <p className="text-gray-100">{projectData.teamLead}</p>
                </div>
              )}

              {/* Methodology */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-400">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Methodology
                </div>
                <p className="text-gray-100 capitalize">{projectData.methodology}</p>
              </div>

              {/* Team Size */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-400">
                  <Users className="h-4 w-4 mr-2" />
                  Team Size
                </div>
                <p className="text-gray-100">{getTeamSizeLabel(projectData.teamSize)}</p>
              </div>

              {/* Target Release Date */}
              {projectData.targetReleaseDate && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    Target Release
                  </div>
                  <p className="text-gray-100">
                    {format(new Date(projectData.targetReleaseDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>

            {/* Repository URL */}
            {projectData.repositoryUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Repository</h3>
                <a 
                  href={projectData.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  {projectData.repositoryUrl}
                </a>
              </div>
            )}

            {/* Repositories Linked */}
            {repositories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Linked Repositories ({repositories.length})</h3>
                <div className="space-y-2">
                  {repositories.map((repo: any) => (
                    <Card key={repo.id} className="bg-card border-gray-600">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-100">{repo.name}</p>
                            <p className="text-xs text-gray-400">{repo.provider}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {repo.defaultBranch}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Metadata */}
        <Separator className="my-6 bg-gray-700" />
        <div className="text-xs text-gray-400">
          <p>Project ID: {projectData.id}</p>
          <p className="mt-1">Created: {format(new Date(projectData.createdAt), 'MMM d, yyyy')}</p>
          <p className="mt-1">Last updated: {format(new Date(projectData.updatedAt), 'MMM d, yyyy HH:mm')}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
