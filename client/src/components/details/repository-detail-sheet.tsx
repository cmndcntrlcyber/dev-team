import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import type { Repository } from "@shared/schema";
import { 
  Edit, 
  Trash2, 
  GitBranch,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Github,
  GitlabIcon
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface RepositoryDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: number | null;
  onEdit: () => void;
  onDelete: () => void;
  onSync?: () => void;
}

export default function RepositoryDetailSheet({ 
  open, 
  onOpenChange, 
  repositoryId, 
  onEdit,
  onDelete,
  onSync
}: RepositoryDetailSheetProps) {
  const { data: repository } = useQuery({
    queryKey: [`/api/repositories/${repositoryId}`],
    enabled: open && !!repositoryId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "github":
        return <Github className="h-6 w-6 text-gray-100" />;
      case "gitlab":
        return <GitlabIcon className="h-6 w-6 text-orange-400" />;
      default:
        return <GitBranch className="h-6 w-6 text-gray-400" />;
    }
  };

  if (!repository) return null;

  const repo = repository as any;
  const project = projects.find((p: any) => p.id === repo.projectId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] bg-surface border-gray-700 overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {getProviderIcon(repo.provider)}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-2xl text-gray-100">
                {repo.name}
              </SheetTitle>
              <SheetDescription className="text-gray-400 mt-2">
                {project?.name || 'Unknown Project'} • {repo.provider}
              </SheetDescription>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex gap-2 mt-4">
            <Badge variant="outline" className="border-gray-600 text-gray-300">
              {repo.defaultBranch}
            </Badge>
            <Badge className={repo.webhooksConfigured ? "bg-success/20 text-success" : "bg-gray-700 text-gray-400"}>
              {repo.webhooksConfigured ? "Webhooks Active" : "No Webhooks"}
            </Badge>
          </div>
        </SheetHeader>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onSync}
            className="flex-1 border-gray-600 text-gray-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          
          <Button
            variant="outline"
            onClick={onEdit}
            className="border-gray-600 text-gray-300"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
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
            <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Repository URL */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Repository URL</h3>
              <div className="flex items-center gap-2">
                <a 
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex-1"
                >
                  {repo.url}
                </a>
                <Button size="sm" variant="outline" className="border-gray-600">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Branch Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-400">
                  <GitBranch className="h-4 w-4 mr-2" />
                  Default Branch
                </div>
                <p className="text-gray-100">{repo.defaultBranch}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-400">
                  Provider
                </div>
                <p className="text-gray-100 capitalize">{repo.provider}</p>
              </div>
            </div>

            {/* Last Commit Info */}
            {repo.lastCommitSha && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Last Commit</h3>
                <Card className="bg-card border-gray-600">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">SHA</span>
                      <code className="text-xs text-gray-300">{repo.lastCommitSha.substring(0, 7)}</code>
                    </div>
                    {repo.lastCommitMessage && (
                      <p className="text-sm text-gray-300">{repo.lastCommitMessage}</p>
                    )}
                    {repo.lastCommitAuthor && (
                      <p className="text-xs text-gray-400">by {repo.lastCommitAuthor}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Webhook Status */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Webhooks</h3>
              <Card className="bg-card border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Configuration Status</span>
                    {repo.webhooksConfigured ? (
                      <div className="flex items-center text-success">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Configured
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-400">
                        <XCircle className="h-4 w-4 mr-1" />
                        Not Configured
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <div className="space-y-4">
              {repo.lastSync ? (
                <Card className="bg-card border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-400">
                        <Clock className="h-4 w-4 mr-2" />
                        Last Synced
                      </div>
                      <p className="text-gray-300">
                        {formatDistanceToNow(new Date(repo.lastSync), { addSuffix: true })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sync activity recorded</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Metadata */}
        <Separator className="my-6 bg-gray-700" />
        <div className="text-xs text-gray-400">
          <p>Repository ID: {repo.id}</p>
          <p className="mt-1">Created: {format(new Date(repo.createdAt), 'MMM d, yyyy')}</p>
          <p className="mt-1">Last updated: {format(new Date(repo.updatedAt), 'MMM d, yyyy HH:mm')}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
