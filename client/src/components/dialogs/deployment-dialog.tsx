import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Deployment } from "@shared/schema";
import { Loader2, Trash2 } from "lucide-react";
import DeleteConfirmationDialog from "./delete-confirmation-dialog";

interface DeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployment?: Deployment;
  mode?: "create" | "edit";
}

interface DeploymentFormData {
  projectId: string;
  environmentId: string;
  version: string;
  gitCommitSha?: string;
  status: string;
}

export default function DeploymentDialog({ open, onOpenChange, deployment, mode = "create" }: DeploymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/projects"] });
  const { data: environments = [] } = useQuery<any[]>({ queryKey: ["/api/environments"] });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<DeploymentFormData>({
    defaultValues: deployment ? {
      projectId: deployment.projectId.toString(),
      environmentId: deployment.environmentId.toString(),
      version: deployment.version,
      gitCommitSha: deployment.gitCommitSha || "",
      status: deployment.status
    } : {
      projectId: "",
      environmentId: "",
      version: "",
      gitCommitSha: "",
      status: "pending"
    }
  });

  const projectId = watch("projectId");
  const environmentId = watch("environmentId");
  const status = watch("status");

  const createMutation = useMutation({
    mutationFn: async (data: DeploymentFormData) => {
      const payload: any = {
        projectId: parseInt(data.projectId),
        environmentId: parseInt(data.environmentId),
        version: data.version,
        status: data.status,
        startedAt: new Date()
      };
      
      // Only include gitCommitSha if it has a value
      if (data.gitCommitSha) payload.gitCommitSha = data.gitCommitSha;
      
      if (mode === "edit" && deployment) {
        return await apiRequest(`/api/deployments/${deployment.id}`, "PUT", payload);
      } else {
        return await apiRequest("/api/deployments", "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      toast({
        title: mode === "edit" ? "Deployment Updated" : "Deployment Created",
        description: mode === "edit" 
          ? "The deployment has been updated successfully."
          : "New deployment has been created successfully.",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} deployment.`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deployment) return;
      return await apiRequest(`/api/deployments/${deployment.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      toast({
        title: "Deployment Deleted",
        description: "The deployment record has been deleted successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete deployment.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = async () => {
    deleteMutation.mutate();
  };

  const onSubmit = handleSubmit((data: DeploymentFormData) => {
    setIsSubmitting(true);
    createMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            {mode === "edit" ? "Edit Deployment" : "Create New Deployment"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectId" className="text-gray-300">
              Project <span className="text-error">*</span>
            </Label>
            <Select value={projectId} onValueChange={(value: string) => setValue("projectId", value)}>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="environmentId" className="text-gray-300">
              Environment <span className="text-error">*</span>
            </Label>
            <Select value={environmentId} onValueChange={(value: string) => setValue("environmentId", value)}>
              <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                <SelectValue placeholder="Select an environment" />
              </SelectTrigger>
              <SelectContent>
                {environments.map((env: any) => (
                  <SelectItem key={env.id} value={env.id.toString()}>
                    {env.name} ({env.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version" className="text-gray-300">
                Version <span className="text-error">*</span>
              </Label>
              <Input
                id="version"
                {...register("version", { required: "Version is required" })}
                className="bg-card border-gray-600 text-gray-100"
                placeholder="v1.0.0"
              />
              {errors.version && <p className="text-sm text-error">{errors.version.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gitCommitSha" className="text-gray-300">
                Git Commit SHA
              </Label>
              <Input
                id="gitCommitSha"
                {...register("gitCommitSha")}
                className="bg-card border-gray-600 text-gray-100"
                placeholder="abc123..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-gray-300">
              Status <span className="text-error">*</span>
            </Label>
            <Select value={status} onValueChange={(value: string) => setValue("status", value)}>
              <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="deploying">Deploying</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="rolled-back">Rolled Back</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex justify-between">
            {mode === "edit" && deployment && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="mr-auto"
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Deployment
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
                {mode === "edit" ? "Update Deployment" : "Create Deployment"}
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
        title="Delete Deployment"
        description="Are you sure you want to delete this deployment record? This action cannot be undone."
        isDeleting={deleteMutation.isPending}
      />
    </Dialog>
  );
}
