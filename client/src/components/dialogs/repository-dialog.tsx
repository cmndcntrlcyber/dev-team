import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Repository } from "@shared/schema";
import { Loader2, Trash2 } from "lucide-react";
import DeleteConfirmationDialog from "./delete-confirmation-dialog";

interface RepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repository?: Repository;
  mode?: "create" | "edit";
}

interface RepositoryFormData {
  projectId: string;
  name: string;
  url: string;
  provider: string;
  defaultBranch: string;
  webhooksConfigured: boolean;
}

export default function RepositoryDialog({ open, onOpenChange, repository, mode = "create" }: RepositoryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<RepositoryFormData>({
    defaultValues: repository ? {
      projectId: repository.projectId.toString(),
      name: repository.name,
      url: repository.url,
      provider: repository.provider,
      defaultBranch: repository.defaultBranch || "main",
      webhooksConfigured: repository.webhooksConfigured || false
    } : {
      projectId: "",
      name: "",
      url: "",
      provider: "github",
      defaultBranch: "main",
      webhooksConfigured: false
    }
  });

  const projectId = watch("projectId");
  const provider = watch("provider");
  const webhooksConfigured = watch("webhooksConfigured");

  const createMutation = useMutation({
    mutationFn: async (data: RepositoryFormData) => {
      const payload: any = {
        projectId: parseInt(data.projectId),
        name: data.name,
        url: data.url,
        provider: data.provider,
        defaultBranch: data.defaultBranch,
        webhooksConfigured: data.webhooksConfigured,
      };
      
      if (mode === "edit" && repository) {
        return await apiRequest(`/api/repositories/${repository.id}`, "PUT", payload);
      } else {
        return await apiRequest("/api/repositories", "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      toast({
        title: mode === "edit" ? "Repository Updated" : "Repository Linked",
        description: mode === "edit" 
          ? "The repository has been updated successfully."
          : "Repository has been linked successfully.",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} repository.`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!repository) return;
      return await apiRequest(`/api/repositories/${repository.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      toast({
        title: "Repository Deleted",
        description: "The repository link has been deleted successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete repository.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = async () => {
    deleteMutation.mutate();
  };

  const onSubmit = handleSubmit((data: RepositoryFormData) => {
    setIsSubmitting(true);
    createMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            {mode === "edit" ? "Edit Repository" : "Link Repository"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="projectId" className="text-gray-300">
              Project <span className="text-error">*</span>
            </Label>
            <Select 
              value={projectId} 
              onValueChange={(value) => setValue("projectId", value)}
            >
              <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.projectId && (
              <p className="text-sm text-error">{errors.projectId.message}</p>
            )}
          </div>

          {/* Repository Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">
              Repository Name <span className="text-error">*</span>
            </Label>
            <Input
              id="name"
              {...register("name", { required: "Repository name is required" })}
              className="bg-card border-gray-600 text-gray-100"
              placeholder="my-awesome-project"
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          {/* Repository URL */}
          <div className="space-y-2">
            <Label htmlFor="url" className="text-gray-300">
              Repository URL <span className="text-error">*</span>
            </Label>
            <Input
              id="url"
              {...register("url", { 
                required: "Repository URL is required",
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: "Please enter a valid URL starting with http:// or https://"
                }
              })}
              className="bg-card border-gray-600 text-gray-100"
              placeholder="https://github.com/username/repo"
            />
            {errors.url && (
              <p className="text-sm text-error">{errors.url.message}</p>
            )}
            <p className="text-xs text-gray-400">Enter the full URL of your repository</p>
          </div>

          {/* Provider and Default Branch */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider" className="text-gray-300">
                Provider <span className="text-error">*</span>
              </Label>
              <Select value={provider} onValueChange={(value) => setValue("provider", value)}>
                <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="gitlab">GitLab</SelectItem>
                  <SelectItem value="bitbucket">Bitbucket</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultBranch" className="text-gray-300">
                Default Branch <span className="text-error">*</span>
              </Label>
              <Input
                id="defaultBranch"
                {...register("defaultBranch", { required: "Default branch is required" })}
                className="bg-card border-gray-600 text-gray-100"
                placeholder="main"
              />
              {errors.defaultBranch && (
                <p className="text-sm text-error">{errors.defaultBranch.message}</p>
              )}
            </div>
          </div>

          {/* Webhooks Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-gray-600">
              <div className="flex-1">
                <Label htmlFor="webhooksConfigured" className="text-gray-300 font-medium">
                  Webhooks Configured
                </Label>
                <p className="text-xs text-gray-400 mt-1">
                  Enable if you have configured webhooks for this repository
                </p>
              </div>
              <Switch
                id="webhooksConfigured"
                checked={webhooksConfigured}
                onCheckedChange={(checked) => setValue("webhooksConfigured", checked)}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {mode === "edit" && repository && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="mr-auto"
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Repository
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
                className="border-gray-600 text-gray-300"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "edit" ? "Update Repository" : "Link Repository"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Repository Link"
        description={`Are you sure you want to delete the repository link for "${repository?.name}"? This will not delete the actual repository, only the link in this system.`}
        isDeleting={deleteMutation.isPending}
      />
    </Dialog>
  );
}
