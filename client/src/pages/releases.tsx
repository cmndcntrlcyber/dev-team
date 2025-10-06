import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, GitBranch, FileText, AlertTriangle, Sparkles, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Release } from "@shared/schema";
import ReleaseDialog from "@/components/dialogs/release-dialog";
import CardGridSkeleton from "@/components/ui/card-grid-skeleton";

export default function Releases() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | undefined>();

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ["/api/releases"],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const filteredReleases = releases.filter((release: Release) => {
    const matchesSearch = release.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         release.version.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === "all" || release.projectId === parseInt(filterProject);
    const matchesStatus = filterStatus === "all" || release.deploymentStatus === filterStatus;
    
    return matchesSearch && matchesProject && matchesStatus;
  });

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case "deployed":
        return <Badge className="bg-success/20 text-success">Deployed</Badge>;
      case "deploying":
        return <Badge className="bg-warning/20 text-warning">Deploying</Badge>;
      case "failed":
        return <Badge className="bg-error/20 text-error">Failed</Badge>;
      default:
        return <Badge className="bg-gray-700 text-gray-300">Pending</Badge>;
    }
  };

  const getVersionBadge = (version: string) => {
    const versionColor = version.includes('beta') || version.includes('alpha') 
      ? "bg-warning/20 text-warning" 
      : "bg-primary/20 text-primary";
    
    return <Badge className={versionColor}>{version}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark">
        <header className="bg-surface border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Releases</h2>
              <p className="text-gray-400 mt-1">Manage software releases and changelogs</p>
            </div>
          </div>
        </header>
        <main className="p-6">
          <CardGridSkeleton count={6} columns={1} />
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
            <h2 className="text-2xl font-bold text-gray-100">Releases</h2>
            <p className="text-gray-400 mt-1">Manage software releases and changelogs</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => {
              setSelectedRelease(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Release
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
                  placeholder="Search releases..."
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
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48 bg-card border-gray-600 text-gray-100">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="deploying">Deploying</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Releases Timeline */}
        {filteredReleases.length === 0 ? (
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-100 mb-2">No Releases Found</h3>
                <p className="text-gray-400 mb-6">
                  {searchTerm ? "No releases match your search criteria." : "Create your first release to get started."}
                </p>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    setSelectedRelease(undefined);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Release
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredReleases.map((release: Release) => {
              const project = projects.find((p: any) => p.id === release.projectId);
              const breakingChangesCount = Array.isArray(release.breakingChanges) ? release.breakingChanges.length : 0;
              
              return (
                <Card key={release.id} className="bg-surface border-gray-700 hover:bg-card transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-xl font-semibold text-gray-100">{release.title}</h3>
                            {getVersionBadge(release.version)}
                            {release.aiGenerated && (
                              <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Generated
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{project?.name || 'Unknown Project'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {getStatusBadge(release.deploymentStatus)}
                        {breakingChangesCount > 0 && (
                          <Badge className="bg-error/20 text-error">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {breakingChangesCount} Breaking Change{breakingChangesCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Release Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      {release.gitTag && (
                        <div className="flex items-center text-gray-400">
                          <GitBranch className="h-4 w-4 mr-2" />
                          <code className="text-xs">{release.gitTag}</code>
                        </div>
                      )}
                      {release.releaseDate && (
                        <div className="flex items-center text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="text-xs">{format(new Date(release.releaseDate), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {release.createdAt && (
                        <div className="flex items-center text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="text-xs">
                            Created {formatDistanceToNow(new Date(release.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Release Notes Preview */}
                    {release.releaseNotes && (
                      <div className="bg-card rounded p-4 mb-4">
                        <p className="text-sm text-gray-300 line-clamp-3">{release.releaseNotes}</p>
                      </div>
                    )}

                    {/* Changelog Preview */}
                    {release.changelog && (
                      <div className="bg-card rounded p-4 mb-4">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-300">Changelog</span>
                        </div>
                        <div className="text-xs text-gray-400 line-clamp-4 whitespace-pre-wrap">
                          {release.changelog}
                        </div>
                      </div>
                    )}

                    {/* Breaking Changes */}
                    {breakingChangesCount > 0 && (
                      <div className="bg-error/10 border border-error/20 rounded p-4 mb-4">
                        <div className="flex items-center mb-2">
                          <AlertTriangle className="h-4 w-4 text-error mr-2" />
                          <span className="text-sm font-medium text-error">Breaking Changes</span>
                        </div>
                        <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                          {release.breakingChanges.slice(0, 3).map((change: string, index: number) => (
                            <li key={index}>{change}</li>
                          ))}
                          {breakingChangesCount > 3 && (
                            <li className="text-gray-400">And {breakingChangesCount - 3} more...</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300"
                      >
                        View Full Details
                      </Button>
                      {release.migrationGuide && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Migration Guide
                        </Button>
                      )}
                      {release.deploymentStatus === "pending" && (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-white ml-auto"
                        >
                          Deploy Release
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Release Dialog */}
      <ReleaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        release={selectedRelease}
        mode={selectedRelease ? "edit" : "create"}
      />
    </div>
  );
}
