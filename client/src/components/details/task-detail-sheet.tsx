import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import { 
  Edit, 
  Trash2, 
  Calendar, 
  User, 
  Circle, 
  Tag, 
  Clock,
  CheckCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number | null;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TaskDetailSheet({ 
  open, 
  onOpenChange, 
  taskId, 
  onEdit,
  onDelete 
}: TaskDetailSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [changingStatus, setChangingStatus] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: open && !!taskId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const project = projects.find((p: any) => p.id === (task as any)?.projectId);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!taskId) return;
      return await apiRequest(`/api/tasks/${taskId}`, "PUT", { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      toast({
        title: "Status Updated",
        description: "Task status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setChangingStatus(false);
    }
  });

  const handleStatusChange = (newStatus: string) => {
    setChangingStatus(true);
    updateStatusMutation.mutate(newStatus);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "bg-blue-500/20 text-blue-400";
      case "bug":
        return "bg-red-500/20 text-red-400";
      case "refactor":
        return "bg-purple-500/20 text-purple-400";
      case "documentation":
        return "bg-green-500/20 text-green-400";
      case "test":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 text-red-400";
      case "high":
        return "bg-orange-500/20 text-orange-400";
      case "medium":
        return "bg-blue-500/20 text-blue-400";
      case "low":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  if (!task) {
    return null;
  }

  const taskData = task as any;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] bg-surface border-gray-700 overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl text-gray-100 pr-8">
                {taskData.title}
              </SheetTitle>
              <SheetDescription className="text-gray-400 mt-2">
                {project?.name || 'Unknown Project'}
              </SheetDescription>
            </div>
          </div>

          {/* Badges and Meta */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className={getTypeColor(taskData.type)} variant="secondary">
              {taskData.type}
            </Badge>
            {taskData.priority && (
              <Badge className={getPriorityColor(taskData.priority)} variant="secondary">
                {taskData.priority}
              </Badge>
            )}
            {taskData.labels?.map((label: string, index: number) => (
              <Badge key={index} variant="outline" className="border-gray-600 text-gray-300">
                <Tag className="h-3 w-3 mr-1" />
                {label}
              </Badge>
            ))}
          </div>
        </SheetHeader>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-6">
          <Select 
            value={taskData.status} 
            onValueChange={handleStatusChange}
            disabled={changingStatus}
          >
            <SelectTrigger className="flex-1 bg-card border-gray-600 text-gray-100">
              {changingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
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
        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="bg-card border border-gray-700">
            <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Details
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            {/* Description */}
            {taskData.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{taskData.description}</p>
              </div>
            )}

            {/* Task Meta Information */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignee */}
              {taskData.assigneeId && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-400">
                    <User className="h-4 w-4 mr-2" />
                    Assigned To
                  </div>
                  <p className="text-gray-100">{taskData.assigneeId}</p>
                </div>
              )}

              {/* Story Points */}
              {taskData.storyPoints && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-400">
                    <Circle className="h-4 w-4 mr-2" />
                    Story Points
                  </div>
                  <p className="text-gray-100">{taskData.storyPoints} points</p>
                </div>
              )}

              {/* Due Date */}
              {taskData.dueDate && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    Due Date
                  </div>
                  <p className="text-gray-100">
                    {format(new Date(taskData.dueDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {/* Created At */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-400">
                  <Clock className="h-4 w-4 mr-2" />
                  Created
                </div>
                <p className="text-gray-100">
                  {format(new Date(taskData.createdAt), 'MMM d, yyyy HH:mm')}
                </p>
              </div>

              {/* Completed At */}
              {taskData.completedAt && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-400">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completed
                  </div>
                  <p className="text-gray-100">
                    {format(new Date(taskData.completedAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>

            {/* Acceptance Criteria */}
            {taskData.acceptanceCriteria && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Acceptance Criteria</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{taskData.acceptanceCriteria}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <div className="space-y-4">
              <div className="text-center py-12 text-gray-400">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Activity tracking coming soon</p>
                <p className="text-sm mt-2">Task history and status changes will be displayed here</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Metadata */}
        <Separator className="my-6 bg-gray-700" />
        <div className="text-xs text-gray-400">
          <p>Task ID: {taskData.id}</p>
          <p className="mt-1">Last updated: {format(new Date(taskData.updatedAt), 'MMM d, yyyy HH:mm')}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
