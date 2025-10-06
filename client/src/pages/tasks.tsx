import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, CheckSquare, Circle, Clock, Users } from "lucide-react";
import type { Task } from "@shared/schema";
import TaskDialog from "@/components/dialogs/task-dialog";
import TaskDetailSheet from "@/components/details/task-detail-sheet";
import DeleteConfirmationDialog from "@/components/dialogs/delete-confirmation-dialog";
import KanbanSkeleton from "@/components/ui/kanban-skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { DraggableTaskCard } from '@/components/kanban/draggable-task-card';
import { DroppableColumn } from '@/components/kanban/droppable-column';

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const filteredTasks = tasks.filter((task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === "all" || task.projectId === parseInt(filterProject);
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    
    return matchesSearch && matchesProject && matchesStatus;
  });

  const tasksByStatus = {
    backlog: filteredTasks.filter((t: Task) => t.status === "backlog"),
    todo: filteredTasks.filter((t: Task) => t.status === "todo"),
    inProgress: filteredTasks.filter((t: Task) => t.status === "in-progress"),
    review: filteredTasks.filter((t: Task) => t.status === "review"),
    done: filteredTasks.filter((t: Task) => t.status === "done"),
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTaskId) return;
      return await apiRequest(`/api/tasks/${selectedTaskId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task Deleted",
        description: "The task has been deleted successfully.",
      });
      setSheetOpen(false);
      setShowDeleteConfirm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task.",
        variant: "destructive",
      });
    }
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setSelectedTask(task);
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: number; newStatus: string }) => {
      return await apiRequest(`/api/tasks/${taskId}`, "PUT", { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task Moved",
        description: "Task status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status.",
        variant: "destructive",
      });
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const taskId = active.id as number;
      const newStatus = over.id as string;
      
      updateStatusMutation.mutate({ taskId, newStatus });
    }
    
    setActiveTaskId(null);
  };

  const activeTask = tasks.find((t: Task) => t.id === activeTaskId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark">
        <header className="bg-surface border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Task Board</h2>
              <p className="text-gray-400 mt-1">Kanban board for task management</p>
            </div>
          </div>
        </header>
        <main className="p-6">
          <KanbanSkeleton />
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
            <h2 className="text-2xl font-bold text-gray-100">Task Board</h2>
            <p className="text-gray-400 mt-1">Kanban board for task management</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => {
              setSelectedTask(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Filters */}
        <Card className="bg-surface border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
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
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Backlog Column */}
          <DroppableColumn id="backlog">
            <Card className="bg-surface border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-100 flex items-center justify-between">
                  <span>Backlog</span>
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                    {tasksByStatus.backlog.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasksByStatus.backlog.map((task: Task) => {
                  const project = projects.find((p: any) => p.id === task.projectId);
                  return (
                    <DraggableTaskCard key={task.id} id={task.id}>
                      <Card 
                        className="bg-card border-gray-600 hover:border-primary cursor-pointer transition-colors"
                        onClick={() => handleTaskClick(task)}
                      >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium text-gray-100 line-clamp-2">{task.title}</h4>
                        </div>
                        <div className="flex items-center flex-wrap gap-1">
                          <Badge className={getTypeColor(task.type)} variant="secondary">
                            {task.type}
                          </Badge>
                          {task.priority && (
                            <Badge className={getPriorityColor(task.priority)} variant="secondary">
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                        {task.storyPoints && (
                          <div className="flex items-center text-xs text-gray-400">
                            <Circle className="h-3 w-3 mr-1" />
                            {task.storyPoints} pts
                          </div>
                        )}
                        {project && (
                          <div className="text-xs text-gray-400">{project.name}</div>
                        )}
                      </div>
                      </CardContent>
                      </Card>
                    </DraggableTaskCard>
                  );
                })}
              </CardContent>
            </Card>
          </DroppableColumn>

          {/* To Do Column */}
          <DroppableColumn id="todo">
            <Card className="bg-surface border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-100 flex items-center justify-between">
                  <span>To Do</span>
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                    {tasksByStatus.todo.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasksByStatus.todo.map((task: Task) => {
                  const project = projects.find((p: any) => p.id === task.projectId);
                  return (
                    <DraggableTaskCard key={task.id} id={task.id}>
                      <Card 
                        className="bg-card border-gray-600 hover:border-primary cursor-pointer transition-colors"
                        onClick={() => handleTaskClick(task)}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-100 line-clamp-2">{task.title}</h4>
                            <div className="flex items-center flex-wrap gap-1">
                              <Badge className={getTypeColor(task.type)} variant="secondary">
                                {task.type}
                              </Badge>
                              {task.priority && (
                                <Badge className={getPriorityColor(task.priority)} variant="secondary">
                                  {task.priority}
                                </Badge>
                              )}
                            </div>
                            {task.storyPoints && (
                              <div className="flex items-center text-xs text-gray-400">
                                <Circle className="h-3 w-3 mr-1" />
                                {task.storyPoints} pts
                              </div>
                            )}
                            {project && (
                              <div className="text-xs text-gray-400">{project.name}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </DraggableTaskCard>
                  );
                })}
              </CardContent>
            </Card>
          </DroppableColumn>

          {/* In Progress Column */}
          <DroppableColumn id="in-progress">
            <Card className="bg-surface border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-100 flex items-center justify-between">
                <span>In Progress</span>
                <Badge variant="secondary" className="bg-warning/20 text-warning">
                  {tasksByStatus.inProgress.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksByStatus.inProgress.map((task: Task) => {
                const project = projects.find((p: any) => p.id === task.projectId);
                return (
                  <DraggableTaskCard key={task.id} id={task.id}>
                    <Card 
                      className="bg-card border-gray-600 hover:border-warning cursor-pointer transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-100 line-clamp-2">{task.title}</h4>
                        <div className="flex items-center flex-wrap gap-1">
                          <Badge className={getTypeColor(task.type)} variant="secondary">
                            {task.type}
                          </Badge>
                          {task.priority && (
                            <Badge className={getPriorityColor(task.priority)} variant="secondary">
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                        {task.storyPoints && (
                          <div className="flex items-center text-xs text-gray-400">
                            <Circle className="h-3 w-3 mr-1" />
                            {task.storyPoints} pts
                          </div>
                        )}
                        {project && (
                          <div className="text-xs text-gray-400">{project.name}</div>
                        )}
                      </div>
                      </CardContent>
                    </Card>
                  </DraggableTaskCard>
                );
              })}
            </CardContent>
          </Card>
          </DroppableColumn>

          {/* Review Column */}
          <DroppableColumn id="review">
            <Card className="bg-surface border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-100 flex items-center justify-between">
                <span>Review</span>
                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                  {tasksByStatus.review.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksByStatus.review.map((task: Task) => {
                const project = projects.find((p: any) => p.id === task.projectId);
                return (
                  <DraggableTaskCard key={task.id} id={task.id}>
                    <Card 
                      className="bg-card border-gray-600 hover:border-primary cursor-pointer transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-100 line-clamp-2">{task.title}</h4>
                        <div className="flex items-center flex-wrap gap-1">
                          <Badge className={getTypeColor(task.type)} variant="secondary">
                            {task.type}
                          </Badge>
                          {task.priority && (
                            <Badge className={getPriorityColor(task.priority)} variant="secondary">
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                        {task.storyPoints && (
                          <div className="flex items-center text-xs text-gray-400">
                            <Circle className="h-3 w-3 mr-1" />
                            {task.storyPoints} pts
                          </div>
                        )}
                        {project && (
                          <div className="text-xs text-gray-400">{project.name}</div>
                        )}
                      </div>
                      </CardContent>
                    </Card>
                  </DraggableTaskCard>
                );
              })}
            </CardContent>
          </Card>
          </DroppableColumn>

          {/* Done Column */}
          <DroppableColumn id="done">
            <Card className="bg-surface border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-100 flex items-center justify-between">
                <span>Done</span>
                <Badge variant="secondary" className="bg-success/20 text-success">
                  {tasksByStatus.done.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksByStatus.done.map((task: Task) => {
                const project = projects.find((p: any) => p.id === task.projectId);
                return (
                  <DraggableTaskCard key={task.id} id={task.id}>
                    <Card 
                      className="bg-card border-gray-600 hover:border-success cursor-pointer transition-colors opacity-75"
                      onClick={() => handleTaskClick(task)}
                    >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-100 line-clamp-2 line-through decoration-gray-500">
                          {task.title}
                        </h4>
                        <div className="flex items-center flex-wrap gap-1">
                          <Badge className={getTypeColor(task.type)} variant="secondary">
                            {task.type}
                          </Badge>
                        </div>
                        {task.storyPoints && (
                          <div className="flex items-center text-xs text-gray-400">
                            <Circle className="h-3 w-3 mr-1" />
                            {task.storyPoints} pts
                          </div>
                        )}
                        {project && (
                          <div className="text-xs text-gray-400">{project.name}</div>
                        )}
                      </div>
                      </CardContent>
                    </Card>
                  </DraggableTaskCard>
                );
              })}
            </CardContent>
          </Card>
          </DroppableColumn>
          </div>
          
          {/* Drag Overlay */}
          <DragOverlay>
            {activeTask ? (
              <Card className="bg-card border-primary border-2 shadow-lg opacity-90">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-100 line-clamp-2">
                      {(activeTask as Task).title}
                    </h4>
                    <div className="flex items-center flex-wrap gap-1">
                      <Badge className={getTypeColor((activeTask as Task).type)} variant="secondary">
                        {(activeTask as Task).type}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon={CheckSquare}
              title={searchTerm || filterProject !== "all" || filterStatus !== "all" ? "No Tasks Found" : "Your Task Board is Empty"}
              description={
                searchTerm || filterProject !== "all" || filterStatus !== "all"
                  ? "No tasks match your current filters. Try adjusting your search or filter criteria."
                  : "Start managing your work by creating your first task. Use the Kanban board to track progress from backlog to completion."
              }
              actionLabel={
                searchTerm || filterProject !== "all" || filterStatus !== "all" 
                  ? "Clear Filters" 
                  : "Create Your First Task"
              }
              onAction={() => {
                if (searchTerm || filterProject !== "all" || filterStatus !== "all") {
                  setSearchTerm("");
                  setFilterProject("all");
                  setFilterStatus("all");
                } else {
                  setSelectedTask(undefined);
                  setDialogOpen(true);
                }
              }}
              tip={!searchTerm && filterProject === "all" && filterStatus === "all" ? "Drag tasks between columns to update their status, or click a task to view details and make changes." : undefined}
            />
          </div>
        )}
      </main>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        taskId={selectedTaskId}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        mode={selectedTask ? "edit" : "create"}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${selectedTask?.title}"? This action cannot be undone.`}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
