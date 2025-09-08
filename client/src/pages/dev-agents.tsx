import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAiAgentSchema, type AiAgent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Bot, 
  Plus, 
  Settings, 
  Zap, 
  Shield, 
  Brain, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Trash2,
  Edit,
  Play,
  Pause,
  GripVertical,
  ArrowRight,
  RotateCcw,
  Target,
  CheckCircle
} from "lucide-react";

const formSchema = insertAiAgentSchema;
type FormData = z.infer<typeof formSchema>;

// Sortable flow item component
function SortableFlowItem({ agent }: { agent: AiAgent }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const AgentIcon = getAgentIcon(agent.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center p-3 bg-surface border border-gray-600 rounded-lg"
    >
      <div
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 mr-3 text-gray-400 hover:text-gray-200"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div className="flex items-center flex-1">
        <div className="bg-primary/10 p-2 rounded-lg mr-3">
          <AgentIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="text-gray-100 font-medium">{agent.name}</h4>
          <p className="text-sm text-gray-400 capitalize">{agent.type} Agent</p>
        </div>
        <div className="text-sm text-gray-500">
          Order: {agent.flowOrder || 0}
        </div>
      </div>
    </div>
  );
}

function getAgentIcon(type: string) {
  switch (type) {
    case 'openai':
      return Bot;
    case 'anthropic':
      return Bot;
    case 'local':
      return Brain;
    case 'burp':
      return Shield;
    default:
      return Bot;
  }
}

export default function AiAgents() {
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: agents, isLoading } = useQuery({
    queryKey: ["/api/ai-agents"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "openai",
      endpoint: "",
      apiKey: "",
      modelPrompt: "",
      flowOrder: 0,
      status: "offline",
      config: {}
    }
  });

  const createAgent = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/ai-agents", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      toast({
        title: "Success",
        description: "AI agent created successfully",
      });
      form.reset();
      setShowForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create AI agent",
        variant: "destructive",
      });
    }
  });

  const updateAgent = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FormData> }) => {
      const response = await apiRequest("PUT", `/api/ai-agents/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      toast({
        title: "Success",
        description: "AI agent updated successfully",
      });
      setEditingAgent(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update AI agent",
        variant: "destructive",
      });
    }
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ai-agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      toast({
        title: "Success",
        description: "AI agent deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete AI agent",
        variant: "destructive",
      });
    }
  });

  const testConnection = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/ai-agents/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      toast({
        title: "Connection Test",
        description: `Status: ${data.status}, Latency: ${data.latency}ms`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: FormData) => {
    if (editingAgent) {
      updateAgent.mutate({ id: editingAgent.id, data });
    } else {
      createAgent.mutate(data);
    }
  };

  const handleEdit = (agent: AiAgent) => {
    setEditingAgent(agent);
    form.reset({
      name: agent.name,
      type: agent.type,
      endpoint: agent.endpoint || "",
      apiKey: agent.apiKey || "",
      modelPrompt: agent.modelPrompt || "",
      flowOrder: agent.flowOrder || 0,
      status: agent.status,
      config: agent.config
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this AI agent?")) {
      deleteAgent.mutate(id);
    }
  };

  const updateFlowOrder = useMutation({
    mutationFn: async ({ agentId, newOrder }: { agentId: number; newOrder: number }) => {
      const response = await apiRequest("PUT", `/api/ai-agents/${agentId}`, { flowOrder: newOrder });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && agents) {
      const sortedAgents = [...agents].sort((a, b) => (a.flowOrder || 0) - (b.flowOrder || 0));
      const oldIndex = sortedAgents.findIndex((agent) => agent.id === active.id);
      const newIndex = sortedAgents.findIndex((agent) => agent.id === over.id);

      const newAgents = arrayMove(sortedAgents, oldIndex, newIndex);
      
      // Update flow order for all agents
      newAgents.forEach((agent, index) => {
        if (agent.flowOrder !== index) {
          updateFlowOrder.mutate({ agentId: agent.id, newOrder: index });
        }
      });
    }
  };

  // Loop management
  const { data: activeLoops } = useQuery({
    queryKey: ["/api/agent-loops"],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const startLoop = useMutation({
    mutationFn: async ({ agentId, vulnerabilityId, initialInput }: { agentId: number; vulnerabilityId: number; initialInput: string }) => {
      const response = await apiRequest("POST", "/api/agent-loops/start", { agentId, vulnerabilityId, initialInput });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-loops"] });
      toast({ title: "Agent loop started successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to start loop", description: error.message, variant: "destructive" });
    },
  });

  const stopLoop = useMutation({
    mutationFn: async (loopId: string) => {
      const response = await apiRequest("POST", `/api/agent-loops/${loopId}/stop`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-loops"] });
      toast({ title: "Agent loop stopped" });
    },
  });



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-success/10 text-success';
      case 'offline':
        return 'bg-error/10 text-error';
      case 'error':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return Wifi;
      case 'offline':
        return WifiOff;
      case 'error':
        return AlertTriangle;
      default:
        return WifiOff;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Loading AI agents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">AI Agents</h2>
            <p className="text-gray-400 mt-1">Manage your AI integrations and automations</p>
          </div>
          <Dialog open={showForm} onOpenChange={(open) => {
            setShowForm(open);
            if (!open) {
              setEditingAgent(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-surface border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-100">
                  {editingAgent ? 'Edit AI Agent' : 'Add New AI Agent'}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Agent Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter agent name"
                              className="bg-card border-gray-600 text-gray-100"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Agent Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                                <SelectValue placeholder="Select agent type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI GPT</SelectItem>
                              <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                              <SelectItem value="local">Local AI (Ollama)</SelectItem>
                              <SelectItem value="burp">Burp Suite</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="endpoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Endpoint URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://api.openai.com/v1 or http://localhost:11434"
                            className="bg-card border-gray-600 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">API Key</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Enter API key (if required)"
                            className="bg-card border-gray-600 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="modelPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Model Prompt</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter custom prompt to characterize this agent's behavior..."
                            className="bg-card border-gray-600 text-gray-100 min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="flowOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Flow Order</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="Agent execution order (0-100)"
                            className="bg-card border-gray-600 text-gray-100"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Loop Configuration */}
                  <div className="border-t border-gray-600 pt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <RotateCcw className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-semibold text-gray-100">Loop Configuration</h3>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="loopEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-gray-200">Enable Agent Loop</FormLabel>
                            <div className="text-sm text-gray-400">
                              Allow this agent to loop with another agent for iterative refinement
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("loopEnabled") && (
                      <div className="mt-4 space-y-4">
                        <FormField
                          control={form.control}
                          name="loopPartnerId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-200">Loop Partner Agent</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger className="bg-surface border-gray-600 text-gray-100">
                                    <SelectValue placeholder="Select agent to loop with" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {agents?.filter(agent => agent.id !== editingAgent?.id).map(agent => (
                                    <SelectItem key={agent.id} value={agent.id.toString()}>
                                      {agent.name} ({agent.type})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="maxLoopIterations"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-200">Maximum Loop Iterations</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="5"
                                  className="bg-surface border-gray-600 text-gray-100"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="loopExitCondition"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-200">Loop Exit Condition</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger className="bg-surface border-gray-600 text-gray-100">
                                    <SelectValue placeholder="Select exit condition" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="functional_poc">Functional POC</SelectItem>
                                  <SelectItem value="vulnerability_confirmed">Vulnerability Confirmed</SelectItem>
                                  <SelectItem value="exploit_successful">Exploit Successful</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={createAgent.isPending || updateAgent.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {(createAgent.isPending || updateAgent.isPending) ? 
                        "Saving..." : 
                        (editingAgent ? "Update Agent" : "Create Agent")
                      }
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="border-gray-600 text-gray-300 hover:bg-card"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Agent Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Agents</p>
                  <p className="text-2xl font-bold text-gray-100 mt-2">
                    {agents?.length || 0}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Bot className="text-primary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Online Agents</p>
                  <p className="text-2xl font-bold text-gray-100 mt-2">
                    {agents?.filter((a: AiAgent) => a.status === 'online').length || 0}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-lg">
                  <Wifi className="text-success h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Error Agents</p>
                  <p className="text-2xl font-bold text-gray-100 mt-2">
                    {agents?.filter((a: AiAgent) => a.status === 'error').length || 0}
                  </p>
                </div>
                <div className="bg-error/10 p-3 rounded-lg">
                  <AlertTriangle className="text-error h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents List */}
        {!agents || agents.length === 0 ? (
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-100 mb-2">No AI Agents Configured</h3>
                <p className="text-gray-400 mb-6">
                  Set up your first AI agent to enable automated vulnerability analysis and report generation.
                </p>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Configure Your First Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {agents.map((agent: AiAgent) => {
              const AgentIcon = getAgentIcon(agent.type);
              const StatusIcon = getStatusIcon(agent.status);
              
              return (
                <Card key={agent.id} className="bg-surface border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-2 rounded-lg mr-3">
                          <AgentIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-gray-100 text-lg">{agent.name}</CardTitle>
                          <p className="text-sm text-gray-400 capitalize">{agent.type} Agent</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(agent.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Type:</span>
                          <p className="text-gray-100 capitalize">{agent.type}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Endpoint:</span>
                          <p className="text-gray-100 truncate">
                            {agent.endpoint || 'Default'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Last Ping:</span>
                          <p className="text-gray-100">
                            {agent.lastPing ? 
                              new Date(agent.lastPing).toLocaleString() : 
                              'Never'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Created:</span>
                          <p className="text-gray-100">
                            {new Date(agent.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testConnection.mutate(agent.id)}
                          disabled={testConnection.isPending}
                          className="flex-1 border-gray-600 text-gray-300"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {testConnection.isPending ? 'Testing...' : 'Test'}
                        </Button>
                        {agent.loopEnabled && agent.loopPartnerId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const initialInput = "Start vulnerability analysis and payload development loop";
                              startLoop.mutate({ 
                                agentId: agent.id, 
                                vulnerabilityId: 1, // Default vulnerability for demo
                                initialInput 
                              });
                            }}
                            disabled={startLoop.isPending}
                            className="border-primary text-primary hover:bg-primary hover:text-white"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {startLoop.isPending ? 'Starting...' : 'Start Loop'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(agent)}
                          className="border-gray-600 text-gray-300"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(agent.id)}
                          className="border-gray-600 text-gray-300 hover:border-error hover:text-error"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Model Prompt */}
                      {agent.modelPrompt && (
                        <div className="mt-4 p-3 bg-card rounded-lg">
                          <h4 className="text-sm font-medium text-gray-100 mb-2">Custom Prompt</h4>
                          <div className="text-xs text-gray-400 italic">
                            "{agent.modelPrompt}"
                          </div>
                        </div>
                      )}

                      {/* Loop Configuration Display */}
                      {agent.loopEnabled && (
                        <div className="mt-4 p-3 bg-card rounded-lg border-l-4 border-primary">
                          <div className="flex items-center space-x-2 mb-2">
                            <RotateCcw className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-medium text-gray-100">Loop Configuration</h4>
                          </div>
                          <div className="text-xs text-gray-400 space-y-1">
                            <div>Partner: {agents?.find(a => a.id === agent.loopPartnerId)?.name || 'Not selected'}</div>
                            <div>Max Iterations: {agent.maxLoopIterations || 5}</div>
                            <div>Exit Condition: {agent.loopExitCondition || 'Not set'}</div>
                          </div>
                        </div>
                      )}

                      {/* Agent-specific capabilities */}
                      <div className="mt-4 p-3 bg-card rounded-lg">
                        <h4 className="text-sm font-medium text-gray-100 mb-2">Capabilities</h4>
                        <div className="text-xs text-gray-400">
                          {agent.type === 'openai' && 
                            'Report generation, vulnerability analysis, CVSS scoring, remediation suggestions'
                          }
                          {agent.type === 'anthropic' && 
                            'Advanced reasoning, vulnerability analysis, comprehensive reporting, ethical assessment'
                          }
                          {agent.type === 'local' && 
                            'Code analysis, vulnerability detection, pattern matching, offline processing'
                          }
                          {agent.type === 'burp' && 
                            'Automated scanning, proxy integration, vulnerability discovery, traffic analysis'
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Flow Order Section */}
        {agents && agents.length > 0 && (
          <div className="mt-8">
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center">
                  <ArrowRight className="h-5 w-5 mr-2 text-primary" />
                  Agent Flow Order
                </CardTitle>
                <p className="text-gray-400 text-sm">
                  Drag and drop to organize the order that AI agents will communicate with each other
                </p>
              </CardHeader>
              <CardContent>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={[...agents].sort((a, b) => (a.flowOrder || 0) - (b.flowOrder || 0)).map(agent => agent.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {[...agents]
                        .sort((a, b) => (a.flowOrder || 0) - (b.flowOrder || 0))
                        .map((agent, index) => (
                          <div key={agent.id} className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary text-sm font-medium">
                              {index + 1}
                            </div>
                            <SortableFlowItem agent={agent} />
                            {index < agents.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                {agents.length > 1 && (
                  <div className="mt-6 p-4 bg-card/50 rounded-lg border border-gray-600">
                    <h4 className="text-sm font-medium text-gray-100 mb-2">How Agent Flow Works</h4>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Agents execute in the order shown above (top to bottom)</li>
                      <li>• Each agent can process and enhance the previous agent's output</li>
                      <li>• Drag agents up or down to change their execution order</li>
                      <li>• The final output combines insights from all agents in sequence</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Agent Loops */}
        {activeLoops && activeLoops.length > 0 && (
          <div className="mt-8">
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center">
                  <RotateCcw className="h-5 w-5 mr-2 text-primary" />
                  Active Agent Loops
                </CardTitle>
                <p className="text-gray-400 text-sm">
                  Monitor running agent loops for iterative payload refinement
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeLoops.map((loop: any) => {
                    const agent = agents?.find((a: any) => a.id === loop.agentId);
                    const partner = agents?.find((a: any) => a.id === loop.partnerId);
                    
                    return (
                      <div key={loop.id} className="p-4 bg-card rounded-lg border border-gray-600">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <Target className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-gray-100">
                                {agent?.name} ↔ {partner?.name}
                              </span>
                            </div>
                            <Badge 
                              variant={loop.status === 'running' ? 'default' : 'secondary'}
                              className={loop.status === 'running' ? 'bg-primary' : ''}
                            >
                              {loop.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400">
                              {loop.currentIteration}/{loop.maxIterations} iterations
                            </span>
                            {loop.status === 'running' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => stopLoop.mutate(loop.id)}
                                disabled={stopLoop.isPending}
                                className="border-gray-600 text-gray-300 hover:border-error hover:text-error"
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                Stop
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>Exit Condition: {loop.exitCondition}</div>
                          <div>Started: {new Date(loop.startedAt).toLocaleString()}</div>
                          {loop.completedAt && (
                            <div>Completed: {new Date(loop.completedAt).toLocaleString()}</div>
                          )}
                        </div>

                        {loop.iterations && loop.iterations.length > 0 && (
                          <div className="mt-3 p-3 bg-surface rounded border border-gray-600">
                            <h5 className="text-xs font-medium text-gray-100 mb-2">Latest Iteration</h5>
                            <div className="text-xs text-gray-400">
                              <div className="mb-1">
                                <span className="text-gray-300">Agent:</span> {agents?.find((a: any) => a.id === loop.iterations[loop.iterations.length - 1].agentId)?.name}
                              </div>
                              <div className="mb-1">
                                <span className="text-gray-300">Output:</span> {loop.iterations[loop.iterations.length - 1].output.substring(0, 100)}...
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-300">Success:</span>
                                {loop.iterations[loop.iterations.length - 1].success ? (
                                  <CheckCircle className="h-3 w-3 text-green-400" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 text-red-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
