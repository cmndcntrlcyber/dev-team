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
import type { Task } from "@shared/schema";
import { Loader2, Trash2 } from "lucide-react";
import DeleteConfirmationDialog from "./delete-confirmation-dialog";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  mode?: "create" | "edit";
}

interface TaskFormData {
  projectId: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority?: string;
  assignedTo?: string;
  storyPoints?: string;
  labels?: string;
  dueDate?: string;
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

export default function TaskDialog({ open, onOpenChange, task, mode = "create" }: TaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<TaskFormData>({
    defaultValues: task ? {
      projectId: task.projectId?.toString() || "",
      title: task.title,
      description: task.description || "",
      type: task.type,
      status: task.status,
      priority: task.priority || "medium",
      assignedTo: task.assigneeId || "",
      storyPoints: task.storyPoints?.toString() || "",
      labels: task.labels?.join(", ") || "",
      dueDate: formatDateForInput(task.dueDate)
    } : {
      projectId: "",
      title: "",
      description: "",
      type: "feature",
      status: "backlog",
      priority: "medium",
      assignedTo: "",
      storyPoints: "",
      labels: "",
      dueDate: ""
    }
  });

  const projectId = watch("projectId");
  const type = watch("type");
  const status = watch("status");
  const priority = watch("priority");

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const payload: any = {
        projectId: parseInt(data.projectId),
        title: data.title,
        type: data.type,
        status: data.status,
        labels: data.labels ? data.labels.split(",").map(l => l.trim()).filter(Boolean) : [],
      };
      
      // Only include optional fields if they have values
      if (data.description) payload.description = data.description;
      if (data.priority) payload.priority = data.priority;
      if (data.assignedTo) payload.assignedTo = data.assignedTo;
      if (data.storyPoints) payload.storyPoints = parseInt(data.storyPoints);
      
      // Clean date field - only include if it has a value
      const cleanedDate = cleanDateField(data.dueDate);
      if (cleanedDate) payload.dueDate = cleanedDate;
      
      if (mode === "edit" && task) {
        return await apiRequest(`/api/tasks/${task.id}`, "PUT", payload);
      } else {
        return await apiRequest("/api/tasks", "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: mode === "edit" ? "Task Updated" : "Task Created",
        description: mode === "edit" 
          ? "The task has been updated successfully."
          : "New task has been created successfully.",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} task.`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      return await apiRequest(`/api/tasks/${task.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task Deleted",
        description: "The task has been deleted successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = async () => {
    deleteMutation.mutate();
  };

  const onSubmit = handleSubmit((data: TaskFormData) => {
    setIsSubmitting(true);
    createMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            {mode === "edit" ? "Edit Task" : "Create New Task"}
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
              onValueChange={(value: string) => setValue("projectId", value)}
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

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">
              Title <span className="text-error">*</span>
            </Label>
            <Input
              id="title"
              {...register("title", { required: "Task title is required" })}
              className="bg-card border-gray-600 text-gray-100"
              placeholder="Enter task title"
            />
            {errors.title && (
              <p className="text-sm text-error">{errors.title.message}</p>
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
              placeholder="Enter task description"
            />
          </div>

          {/* Type and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-gray-300">
                Type <span className="text-error">*</span>
              </Label>
              <Select value={type} onValueChange={(value: string) => setValue("type", value)}>
                <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="refactor">Refactor</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
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
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority and Story Points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-gray-300">
                Priority
              </Label>
              <Select value={priority} onValueChange={(value: string) => setValue("priority", value)}>
                <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storyPoints" className="text-gray-300">
                Story Points
              </Label>
              <Input
                id="storyPoints"
                type="number"
                min="0"
                {...register("storyPoints")}
                className="bg-card border-gray-600 text-gray-100"
                placeholder="1, 2, 3, 5, 8..."
              />
            </div>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo" className="text-gray-300">
              Assigned To
            </Label>
            <Input
              id="assignedTo"
              {...register("assignedTo")}
              className="bg-card border-gray-600 text-gray-100"
              placeholder="Enter assignee name"
            />
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label htmlFor="labels" className="text-gray-300">
              Labels
            </Label>
            <Input
              id="labels"
              {...register("labels")}
              className="bg-card border-gray-600 text-gray-100"
              placeholder="frontend, backend, urgent (comma-separated)"
            />
            <p className="text-xs text-gray-400">Enter labels separated by commas</p>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-gray-300">
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              {...register("dueDate")}
              className="bg-card border-gray-600 text-gray-100"
            />
          </div>

          <DialogFooter className="flex justify-between">
            {mode === "edit" && task && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="mr-auto"
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Task
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
                {mode === "edit" ? "Update Task" : "Create Task"}
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
        title="Delete Task"
        description={`Are you sure you want to delete "${task?.title}"? This action cannot be undone.`}
        isDeleting={deleteMutation.isPending}
      />
    </Dialog>
  );
}
