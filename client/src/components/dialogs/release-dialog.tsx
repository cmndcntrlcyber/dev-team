import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Release } from "@shared/schema";
import { Loader2, Trash2 } from "lucide-react";
import DeleteConfirmationDialog from "./delete-confirmation-dialog";

interface ReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release?: Release;
  mode?: "create" | "edit";
}

interface ReleaseFormData {
  projectId: string;
  version: string;
  title: string;
  releaseNotes?: string;
  gitTag?: string;
  releaseDate?: string;
  deploymentStatus?: string;
}

// Utility function to convert Date to YYYY-MM-DD format
function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split('T')[0];
}

// Utility function to clean form data - convert empty strings to undefined
function cleanDateField(value: string | undefined): string | undefined {
  return value && value.trim() !== "" ? value : undefined;
}

export default function ReleaseDialog({ open, onOpenChange, release, mode = "create" }: ReleaseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/projects"] });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<ReleaseFormData>({
    defaultValues: release ? {
      projectId: release.projectId.toString(),
      version: release.version,
      title: release.title,
      releaseNotes: release.releaseNotes || "",
      gitTag: release.gitTag || "",
      releaseDate: formatDateForInput(release.releaseDate),
      deploymentStatus: release.deploymentStatus || "pending"
    } : {
      projectId: "",
      version: "",
      title: "",
      releaseNotes: "",
      gitTag: "",
      releaseDate: "",
      deploymentStatus: "pending"
    }
  });

  const projectId = watch("projectId");
  const deploymentStatus = watch("deploymentStatus");

  const createMutation = useMutation({
    mutationFn: async (data: ReleaseFormData) => {
      const payload: any = {
        projectId: parseInt(data.projectId),
        version: data.version,
        title: data.title,
        aiGenerated: false,
        breakingChanges: []
      };
      
      // Only include optional fields if they have values
      if (data.releaseNotes) payload.releaseNotes = data.releaseNotes;
      if (data.gitTag) payload.gitTag = data.gitTag;
      if (data.deploymentStatus) payload.deploymentStatus = data.deploymentStatus;
      
      // Clean date field - only include if it has a value
      const cleanedDate = cleanDateField(data.releaseDate);
      if (cleanedDate) payload.releaseDate = cleanedDate;
      
      if (mode === "edit" && release) {
        return await apiRequest(`/api/releases/${release.id}`, "PUT", payload);
      } else {
        return await apiRequest("/api/releases", "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({
        title: mode === "edit" ? "Release Updated" : "Release Created",
        description: mode === "edit" 
          ? "The release has been updated successfully."
          : "New release has been created successfully.",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} release.`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!release) return;
      return await apiRequest(`/api/releases/${release.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({
        title: "Release Deleted",
        description: "The release has been deleted successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete release.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = async () => {
    deleteMutation.mutate();
  };

  const onSubmit = handleSubmit((data: ReleaseFormData) => {
    setIsSubmitting(true);
    createMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            {mode === "edit" ? "Edit Release" : "Create New Release"}
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
              <Label htmlFor="gitTag" className="text-gray-300">
                Git Tag
              </Label>
              <Input
                id="gitTag"
                {...register("gitTag")}
                className="bg-card border-gray-600 text-gray-100"
                placeholder="v1.0.0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">
              Release Title <span className="text-error">*</span>
            </Label>
            <Input
              id="title"
              {...register("title", { required: "Title is required" })}
              className="bg-card border-gray-600 text-gray-100"
              placeholder="Major Feature Release"
            />
            {errors.title && <p className="text-sm text-error">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="releaseNotes" className="text-gray-300">
              Release Notes
            </Label>
            <Textarea
              id="releaseNotes"
              {...register("releaseNotes")}
              className="bg-card border-gray-600 text-gray-100 min-h-[120px]"
              placeholder="Describe what's new in this release..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="releaseDate" className="text-gray-300">
                Release Date
              </Label>
              <Input
                id="releaseDate"
                type="date"
                {...register("releaseDate")}
                className="bg-card border-gray-600 text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deploymentStatus" className="text-gray-300">
                Deployment Status
              </Label>
              <Select value={deploymentStatus} onValueChange={(value: string) => setValue("deploymentStatus", value)}>
                <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="deploying">Deploying</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {mode === "edit" && release && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="mr-auto"
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Release
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
                {mode === "edit" ? "Update Release" : "Create Release"}
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
        title="Delete Release"
        description={`Are you sure you want to delete release "${release?.version}"? This action cannot be undone.`}
        isDeleting={deleteMutation.isPending}
      />
    </Dialog>
  );
}
