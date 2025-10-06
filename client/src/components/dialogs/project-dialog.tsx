import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Project } from "@shared/schema";
import { Loader2, Trash2 } from "lucide-react";
import DeleteConfirmationDialog from "./delete-confirmation-dialog";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  mode?: "create" | "edit";
}

interface ProjectFormData {
  name: string;
  description: string;
  methodology: string;
  status: string;
  teamSize: string;
  teamLead?: string;
  repositoryUrl?: string;
  techStack?: string;
  targetReleaseDate?: string;
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

export default function ProjectDialog({ open, onOpenChange, project, mode = "create" }: ProjectDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<ProjectFormData>({
    defaultValues: project ? {
      name: project.name,
      description: project.description || "",
      methodology: project.methodology || "agile",
      status: project.status,
      teamSize: project.teamSize || "small",
      teamLead: project.teamLead || "",
      repositoryUrl: project.repositoryUrl || "",
      techStack: project.techStack?.join(", ") || "",
      targetReleaseDate: formatDateForInput(project.targetReleaseDate)
    } : {
      name: "",
      description: "",
      methodology: "agile",
      status: "planning",
      teamSize: "small",
      teamLead: "",
      repositoryUrl: "",
      techStack: "",
      targetReleaseDate: ""
    }
  });

  const methodology = watch("methodology");
  const status = watch("status");
  const teamSize = watch("teamSize");

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const payload: any = {
        name: data.name,
        description: data.description || "",
        methodology: data.methodology,
        status: data.status,
        teamSize: data.teamSize,
        techStack: data.techStack ? data.techStack.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      
      // Only include optional fields if they have values
      if (data.teamLead) payload.teamLead = data.teamLead;
      if (data.repositoryUrl) payload.repositoryUrl = data.repositoryUrl;
      
      // Clean date field - only include if it has a value
      const cleanedDate = cleanDateField(data.targetReleaseDate);
      if (cleanedDate) payload.targetReleaseDate = cleanedDate;
      
      if (mode === "edit" && project) {
        return await apiRequest(`/api/projects/${project.id}`, "PUT", payload);
      } else {
        return await apiRequest("/api/projects", "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: mode === "edit" ? "Project Updated" : "Project Created",
        description: mode === "edit" 
          ? "The project has been updated successfully."
          : "New project has been created successfully.",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} project.`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!project) return;
      return await apiRequest(`/api/projects/${project.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Deleted",
        description: "The project has been deleted successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = async () => {
    deleteMutation.mutate();
  };

  const onSubmit = handleSubmit((data: ProjectFormData) => {
    setIsSubmitting(true);
    createMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            {mode === "edit" ? "Edit Project" : "Create New Project"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">
              Project Name <span className="text-error">*</span>
            </Label>
            <Input
              id="name"
              {...register("name", { required: "Project name is required" })}
              className="bg-card border-gray-600 text-gray-100"
              placeholder="Enter project name"
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">
              Description
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              className="bg-card border-gray-600 text-gray-100 min-h-[100px]"
              placeholder="Enter project description"
            />
          </div>

          {/* Methodology and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="methodology" className="text-gray-300">
                Methodology <span className="text-error">*</span>
              </Label>
              <Select value={methodology} onValueChange={(value: string) => setValue("methodology", value)}>
                <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agile">Agile</SelectItem>
                  <SelectItem value="scrum">Scrum</SelectItem>
                  <SelectItem value="kanban">Kanban</SelectItem>
                  <SelectItem value="waterfall">Waterfall</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team Size and Team Lead */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamSize" className="text-gray-300">
                Team Size <span className="text-error">*</span>
              </Label>
              <Select value={teamSize} onValueChange={(value: string) => setValue("teamSize", value)}>
                <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (1-5)</SelectItem>
                  <SelectItem value="medium">Medium (6-15)</SelectItem>
                  <SelectItem value="large">Large (16+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamLead" className="text-gray-300">
                Team Lead
              </Label>
              <Input
                id="teamLead"
                {...register("teamLead")}
                className="bg-card border-gray-600 text-gray-100"
                placeholder="Enter team lead name"
              />
            </div>
          </div>

          {/* Repository URL */}
          <div className="space-y-2">
            <Label htmlFor="repositoryUrl" className="text-gray-300">
              Repository URL
            </Label>
            <Input
              id="repositoryUrl"
              {...register("repositoryUrl")}
              className="bg-card border-gray-600 text-gray-100"
              placeholder="https://github.com/username/repo"
            />
          </div>

          {/* Tech Stack */}
          <div className="space-y-2">
            <Label htmlFor="techStack" className="text-gray-300">
              Tech Stack
            </Label>
            <Input
              id="techStack"
              {...register("techStack")}
              className="bg-card border-gray-600 text-gray-100"
              placeholder="React, Node.js, PostgreSQL (comma-separated)"
            />
            <p className="text-xs text-gray-400">Enter technologies separated by commas</p>
          </div>

          {/* Target Release Date */}
          <div className="space-y-2">
            <Label htmlFor="targetReleaseDate" className="text-gray-300">
              Target Release Date
            </Label>
            <Input
              id="targetReleaseDate"
              type="date"
              {...register("targetReleaseDate")}
              className="bg-card border-gray-600 text-gray-100"
            />
          </div>

          <DialogFooter className="flex justify-between">
            {mode === "edit" && project && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="mr-auto"
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
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
                {mode === "edit" ? "Update Project" : "Create Project"}
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
        title="Delete Project"
        description={`Are you sure you want to delete "${project?.name}"? This action cannot be undone.`}
        itemName={project?.name}
        requiresTypeToConfirm={true}
        isDeleting={deleteMutation.isPending}
      />
    </Dialog>
  );
}
