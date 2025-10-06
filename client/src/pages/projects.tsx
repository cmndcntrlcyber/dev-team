import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Briefcase, GitBranch, Users, Calendar } from "lucide-react";
import { type Project } from "@shared/schema";
import ProjectDialog from "@/components/dialogs/project-dialog";
import ProjectDetailSheet from "@/components/details/project-detail-sheet";
import DeleteConfirmationDialog from "@/components/dialogs/delete-confirmation-dialog";
import CardGridSkeleton from "@/components/ui/card-grid-skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/projects"],
  });

  const filteredProjects = projects.filter((project: Project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) return;
      return await apiRequest(`/api/projects/${selectedProjectId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Deleted",
        description: "The project has been deleted successfully.",
      });
      setSheetOpen(false);
      setShowDeleteConfirm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      });
    }
  });

  const handleProjectClick = (project: Project) => {
    setSelectedProjectId(project.id);
    setSelectedProject(project);
    setSheetOpen(true);
  };

  const handleEdit = () => {
    setSheetOpen(false);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    setSheetOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark">
        <header className="bg-surface border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Software Projects</h2>
              <p className="text-gray-400 mt-1">Manage your software development projects</p>
            </div>
          </div>
        </header>
        <main className="p-6">
          <CardGridSkeleton count={9} columns={3} />
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
            <h2 className="text-2xl font-bold text-gray-100">Software Projects</h2>
            <p className="text-gray-400 mt-1">Manage your software development projects</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => {
              setSelectedProject(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Search and Filter */}
        <Card className="bg-surface border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-card border-gray-600 text-gray-100"
                />
              </div>
              <Button variant="outline" className="border-gray-600 text-gray-300">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={searchTerm ? "No Projects Found" : "Welcome to Projects"}
            description={
              searchTerm 
                ? "No projects match your search criteria. Try adjusting your search terms."
                : "Get started by creating your first software development project. Projects help you organize tasks, repositories, and team collaboration."
            }
            actionLabel={searchTerm ? "Clear Search" : "Create Your First Project"}
            onAction={() => {
              if (searchTerm) {
                setSearchTerm("");
              } else {
                setSelectedProject(undefined);
                setDialogOpen(true);
              }
            }}
            tip={!searchTerm ? "Choose a methodology (Agile, Scrum, Kanban) that fits your team's workflow best." : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project: Project) => (
              <Card 
                key={project.id} 
                className="bg-surface border-gray-700 hover:bg-card cursor-pointer transition-colors"
                onClick={() => handleProjectClick(project)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white text-lg font-bold mr-3">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-100">{project.name}</CardTitle>
                        {project.methodology && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {project.methodology}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{project.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-400">
                      <Users className="h-4 w-4 mr-2" />
                      <span>{getTeamSizeLabel(project.teamSize || "small")}</span>
                    </div>
                    {project.repositoryUrl && (
                      <div className="flex items-center text-gray-400">
                        <GitBranch className="h-4 w-4 mr-2" />
                        <span>Linked</span>
                      </div>
                    )}
                  </div>

                  {project.techStack && project.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.techStack.slice(0, 3).map((tech, index) => (
                        <Badge key={index} variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {project.techStack.length > 3 && (
                        <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                          +{project.techStack.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {project.targetReleaseDate && (
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      Target: {new Date(project.targetReleaseDate).toLocaleDateString()}
                    </div>
                  )}

                  {project.teamLead && (
                    <div className="text-xs text-gray-400">
                      Lead: {project.teamLead}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Project Detail Sheet */}
      <ProjectDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        projectId={selectedProjectId}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Project Dialog */}
      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={selectedProject}
        mode={selectedProject ? "edit" : "create"}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone and will affect all related tasks.`}
        itemName={selectedProject?.name}
        requiresTypeToConfirm={true}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
