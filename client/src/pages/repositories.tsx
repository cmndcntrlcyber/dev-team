import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Github, GitlabIcon, Search, Plus, RefreshCw, Settings, ExternalLink, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Repository } from "@shared/schema";
import RepositoryDialog from "@/components/dialogs/repository-dialog";
import RepositoryDetailSheet from "@/components/details/repository-detail-sheet";
import DeleteConfirmationDialog from "@/components/dialogs/delete-confirmation-dialog";
import CardGridSkeleton from "@/components/ui/card-grid-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Repositories() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<Repository | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: repositories = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/repositories"],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const filteredRepositories = repositories.filter((repo: Repository) => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === "all" || repo.projectId === parseInt(filterProject);
    const matchesProvider = filterProvider === "all" || repo.provider === filterProvider;
    
    return matchesSearch && matchesProject && matchesProvider;
  });

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "github":
        return <Github className="h-5 w-5" />;
      case "gitlab":
        return <GitlabIcon className="h-5 w-5" />;
      default:
        return <GitBranch className="h-5 w-5" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "github":
        return "text-gray-100";
      case "gitlab":
        return "text-orange-400";
      case "bitbucket":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  const deleteRepositoryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRepositoryId) return;
      return await apiRequest(`/api/repositories/${selectedRepositoryId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      toast({
        title: "Repository Deleted",
        description: "The repository link has been deleted successfully.",
      });
      setSheetOpen(false);
      setShowDeleteConfirm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete repository.",
        variant: "destructive",
      });
    }
  });

  const handleRepositoryClick = (repo: Repository) => {
    setSelectedRepositoryId(repo.id);
    setSelectedRepository(repo);
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
    deleteRepositoryMutation.mutate();
  };

  const handleSync = () => {
    refetch();
    toast({
      title: "Sync Complete",
      description: "Repository data refreshed successfully.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark">
        <header className="bg-surface border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Repositories</h2>
              <p className="text-gray-400 mt-1">Manage your Git repositories and version control</p>
            </div>
          </div>
        </header>
        <main className="p-6">
          <CardGridSkeleton count={6} columns={3} />
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
            <h2 className="text-2xl font-bold text-gray-100">Repositories</h2>
            <p className="text-gray-400 mt-1">Manage your Git repositories and version control</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => {
              setSelectedRepository(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Link Repository
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Search and Filters */}
        <Card className="bg-surface border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-card border-gray-600 text-gray-100"
                />
              </div>
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
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="w-48 bg-card border-gray-600 text-gray-100">
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="gitlab">GitLab</SelectItem>
                  <SelectItem value="bitbucket">Bitbucket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Repositories Grid */}
        {filteredRepositories.length === 0 ? (
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GitBranch className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-100 mb-2">No Repositories Found</h3>
                <p className="text-gray-400 mb-6">
                  {searchTerm ? "No repositories match your search criteria." : "Link your first Git repository to get started."}
                </p>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    setSelectedRepository(undefined);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Link Your First Repository
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRepositories.map((repo: Repository) => {
              const project = projects.find((p: any) => p.id === repo.projectId);
              
              return (
                <Card 
                  key={repo.id} 
                  className="bg-surface border-gray-700 hover:bg-card transition-colors cursor-pointer"
                  onClick={() => handleRepositoryClick(repo)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`${getProviderColor(repo.provider)}`}>
                          {getProviderIcon(repo.provider)}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-100 mb-1">
                            {repo.name}
                          </CardTitle>
                          {project && (
                            <p className="text-sm text-gray-400">{project.name}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {repo.provider}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* URL */}
                    <div className="flex items-center text-sm">
                      <ExternalLink className="h-4 w-4 text-gray-400 mr-2" />
                      <a 
                        href={repo.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {repo.url.replace('https://', '')}
                      </a>
                    </div>

                    {/* Default Branch */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Default Branch:</span>
                      <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                        {repo.defaultBranch}
                      </Badge>
                    </div>

                    {/* Last Commit */}
                    {repo.lastCommitSha && (
                      <div className="bg-card rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Last Commit</span>
                          <code className="text-xs text-gray-300">{repo.lastCommitSha.substring(0, 7)}</code>
                        </div>
                        {repo.lastCommitMessage && (
                          <p className="text-xs text-gray-300 truncate">{repo.lastCommitMessage}</p>
                        )}
                        {repo.lastCommitAuthor && (
                          <p className="text-xs text-gray-400">by {repo.lastCommitAuthor}</p>
                        )}
                      </div>
                    )}

                    {/* Webhook Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Webhooks:</span>
                      <Badge className={repo.webhooksConfigured ? "bg-success/20 text-success" : "bg-gray-700 text-gray-400"}>
                        {repo.webhooksConfigured ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>

                    {/* Last Sync */}
                    {repo.lastSync && (
                      <div className="flex items-center text-xs text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Synced {formatDistanceToNow(new Date(repo.lastSync), { addSuffix: true })}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-300"
                        onClick={() => refetch()}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-300"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Repository Detail Sheet */}
      <RepositoryDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        repositoryId={selectedRepositoryId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSync={handleSync}
      />

      {/* Repository Dialog */}
      <RepositoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        repository={selectedRepository}
        mode={selectedRepository ? "edit" : "create"}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Repository Link"
        description={`Are you sure you want to delete the repository link for "${selectedRepository?.name}"? This will not delete the actual repository.`}
        isDeleting={deleteRepositoryMutation.isPending}
      />
    </div>
  );
}
