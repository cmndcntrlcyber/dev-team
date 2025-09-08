import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAiAgentSchema, type AiAgent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  Activity,
  CheckCircle,
  Target,
  Server,
  Users,
  MessageSquare,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Cpu,
  HardDrive,
  Code,
  Layers,
  Package
} from "lucide-react";

// Agent type definitions matching backend architecture
type AgentType = 
  | 'ARCHITECTURE_LEAD'
  | 'FRONTEND_CORE'
  | 'BACKEND_INTEGRATION'
  | 'QUALITY_ASSURANCE'
  | 'DEVOPS'
  | 'MCP_INTEGRATION';

type AgentStatus = 
  | 'INITIALIZING'
  | 'READY'
  | 'BUSY'
  | 'BLOCKED'
  | 'ERROR'
  | 'OFFLINE';

const formSchema = insertAiAgentSchema.extend({
  type: z.enum(['ARCHITECTURE_LEAD', 'FRONTEND_CORE', 'BACKEND_INTEGRATION', 'QUALITY_ASSURANCE', 'DEVOPS', 'MCP_INTEGRATION']),
  status: z.enum(['INITIALIZING', 'READY', 'BUSY', 'BLOCKED', 'ERROR', 'OFFLINE']).optional(),
});

type FormData = z.infer<typeof formSchema>;

function getAgentIcon(type: string) {
  switch (type) {
    case 'ARCHITECTURE_LEAD':
      return Layers;
    case 'FRONTEND_CORE':
      return Code;
    case 'BACKEND_INTEGRATION':
      return Server;
    case 'QUALITY_ASSURANCE':
      return CheckCircle;
    case 'DEVOPS':
      return Package;
    case 'MCP_INTEGRATION':
      return Shield;
    default:
      return Bot;
  }
}

function getAgentColor(type: string) {
  switch (type) {
    case 'ARCHITECTURE_LEAD':
      return 'text-purple-400 bg-purple-400/10';
    case 'FRONTEND_CORE':
      return 'text-blue-400 bg-blue-400/10';
    case 'BACKEND_INTEGRATION':
      return 'text-green-400 bg-green-400/10';
    case 'QUALITY_ASSURANCE':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'DEVOPS':
      return 'text-orange-400 bg-orange-400/10';
    case 'MCP_INTEGRATION':
      return 'text-cyan-400 bg-cyan-400/10';
    default:
      return 'text-gray-400 bg-gray-400/10';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'READY':
      return <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />;
    case 'BUSY':
      return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />;
    case 'ERROR':
      return <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />;
    case 'BLOCKED':
      return <div className="w-2 h-2 bg-orange-400 rounded-full" />;
    case 'INITIALIZING':
      return <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />;
    case 'OFFLINE':
    default:
      return <div className="w-2 h-2 bg-gray-600 rounded-full" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'READY':
      return 'text-green-400';
    case 'BUSY':
      return 'text-yellow-400';
    case 'ERROR':
      return 'text-red-400';
    case 'BLOCKED':
      return 'text-orange-400';
    case 'INITIALIZING':
      return 'text-blue-400';
    case 'OFFLINE':
    default:
      return 'text-gray-500';
  }
}

// Agent Card Component with enhanced metrics
function AgentCard({ agent, onEdit, onDelete }: { agent: AiAgent; onEdit: () => void; onDelete: () => void; }) {
  const AgentIcon = getAgentIcon(agent.type);
  const agentColor = getAgentColor(agent.type);
  const statusColor = getStatusColor(agent.status);
  
  const cpuUsage = agent.cpuUsage ? parseFloat(agent.cpuUsage) : 0;
  const memoryUsage = agent.memoryUsage ? parseFloat(agent.memoryUsage) : 0;
  const taskProgress = agent.currentTaskProgress || 0;
  const uptime = agent.uptime || 0;
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  
  return (
    <Card className="bg-surface border-gray-700 hover:border-gray-600 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${agentColor}`}>
              <AgentIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-gray-100 font-semibold flex items-center gap-2">
                {agent.name}
                {getStatusIcon(agent.status)}
              </h3>
              <p className="text-sm text-gray-400">{agent.type.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-gray-100"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-red-400"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`${statusColor} border-gray-600`}>
            {agent.status}
          </Badge>
          <span className="text-xs text-gray-500">
            Uptime: {uptimeHours}h {uptimeMinutes}m
          </span>
        </div>
        
        {/* Current Task Progress */}
        {agent.currentTaskId && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Current Task</span>
              <span className="text-gray-300">{taskProgress}%</span>
            </div>
            <Progress value={taskProgress} className="h-1" />
          </div>
        )}
        
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Cpu className="h-3 w-3" />
              CPU Usage
            </div>
            <div className="flex items-center gap-2">
              <Progress value={cpuUsage} className="h-1 flex-1" />
              <span className="text-xs text-gray-300 w-10 text-right">{cpuUsage}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <HardDrive className="h-3 w-3" />
              Memory
            </div>
            <div className="flex items-center gap-2">
              <Progress value={memoryUsage} className="h-1 flex-1" />
              <span className="text-xs text-gray-300 w-10 text-right">{memoryUsage}%</span>
            </div>
          </div>
        </div>
        
        {/* Task Stats */}
        <div className="flex justify-between text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span className="text-gray-400">Completed:</span>
            <span className="text-gray-300">{agent.tasksCompleted || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-400" />
            <span className="text-gray-400">Failed:</span>
            <span className="text-gray-300">{agent.tasksFailed || 0}</span>
          </div>
        </div>
        
        {/* Task Queue */}
        {agent.taskQueue && agent.taskQueue.length > 0 && (
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Queue</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {agent.taskQueue.length} tasks
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// System Metrics Component
function SystemMetrics({ agents }: { agents: AiAgent[] }) {
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'READY' || a.status === 'BUSY').length;
  const busyAgents = agents.filter(a => a.status === 'BUSY').length;
  const errorAgents = agents.filter(a => a.status === 'ERROR').length;
  
  const totalTasksCompleted = agents.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0);
  const totalTasksFailed = agents.reduce((sum, a) => sum + (a.tasksFailed || 0), 0);
  const avgResponseTime = agents.reduce((sum, a) => sum + parseFloat(a.averageResponseTime || '0'), 0) / (agents.length || 1);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <Card className="bg-surface/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total Agents</p>
              <p className="text-2xl font-bold text-gray-100">{totalAgents}</p>
            </div>
            <Users className="h-8 w-8 text-gray-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-surface/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-400">{activeAgents}</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-surface/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Busy</p>
              <p className="text-2xl font-bold text-yellow-400">{busyAgents}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-surface/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Errors</p>
              <p className="text-2xl font-bold text-red-400">{errorAgents}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-surface/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Tasks Done</p>
              <p className="text-2xl font-bold text-gray-100">{totalTasksCompleted}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-gray-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-surface/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-400">{totalTasksFailed}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-surface/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Avg Response</p>
              <p className="text-2xl font-bold text-gray-100">{avgResponseTime.toFixed(0)}ms</p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DevAgents() {
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "FRONTEND_CORE",
      endpoint: "",
      apiKey: "",
      modelPrompt: "",
      flowOrder: 0,
      loopEnabled: false,
      maxLoopIterations: 5,
    },
  });

  const { data: agents = [], isLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai-agents"],
  });

  const createAgent = useMutation({
    mutationFn: (data: FormData) => apiRequest("/api/ai-agents", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      setShowForm(false);
      form.reset();
      toast({
        title: "Success",
        description: "Agent created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAgent = useMutation({
    mutationFn: (data: FormData & { id: number }) => apiRequest(`/api/ai-agents/${data.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      setEditingAgent(null);
      form.reset();
      toast({
        title: "Success",
        description: "Agent updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAgent = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/ai-agents/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      toast({
        title: "Success",
        description: "Agent deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    if (editingAgent) {
      updateAgent.mutate({ ...data, id: editingAgent.id });
    } else {
      createAgent.mutate(data);
    }
  };

  const handleEdit = (agent: AiAgent) => {
    setEditingAgent(agent);
    form.reset({
      name: agent.name,
      type: agent.type as AgentType,
      endpoint: agent.endpoint || "",
      apiKey: agent.apiKey || "",
      modelPrompt: agent.modelPrompt || "",
      flowOrder: agent.flowOrder || 0,
      loopEnabled: agent.loopEnabled || false,
      maxLoopIterations: agent.maxLoopIterations || 5,
      loopExitCondition: agent.loopExitCondition || "",
    });
    setShowForm(true);
  };

  // Auto-refresh agents every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Group agents by type
  const agentsByType = (agents as AiAgent[]).reduce((acc: Record<string, AiAgent[]>, agent: AiAgent) => {
    const type = agent.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(agent);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Dev Team Agents</h1>
          <p className="text-gray-400 mt-1">Orchestrate and monitor your development team's AI agents</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingAgent(null);
                form.reset();
              }}
              className="bg-primary hover:bg-primary/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gray-100">
                {editingAgent ? "Edit Agent" : "Create New Agent"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Frontend Lead" className="bg-background border-gray-600" />
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
                      <FormLabel>Agent Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-gray-600">
                            <SelectValue placeholder="Select agent type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ARCHITECTURE_LEAD">Architecture Lead</SelectItem>
                          <SelectItem value="FRONTEND_CORE">Frontend Core</SelectItem>
                          <SelectItem value="BACKEND_INTEGRATION">Backend Integration</SelectItem>
                          <SelectItem value="QUALITY_ASSURANCE">Quality Assurance</SelectItem>
                          <SelectItem value="DEVOPS">DevOps</SelectItem>
                          <SelectItem value="MCP_INTEGRATION">MCP Integration</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Endpoint</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="http://localhost:3001" className="bg-background border-gray-600" />
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
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="password" placeholder="Optional API key" className="bg-background border-gray-600" />
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
                      <FormLabel>System Prompt</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} placeholder="Agent instructions and behavior..." className="bg-background border-gray-600 min-h-[100px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingAgent(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/80">
                    {editingAgent ? "Update" : "Create"} Agent
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* System Metrics */}
      <SystemMetrics agents={agents} />

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-surface border border-gray-700">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="health">Health Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <Card className="bg-surface border-gray-700">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="h-16 w-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No agents configured</h3>
                <p className="text-gray-500 text-center mb-4">Add your first agent to start orchestrating your dev team</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(agents as AiAgent[]).map((agent: AiAgent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={() => handleEdit(agent)}
                  onDelete={() => deleteAgent.mutate(agent.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-type" className="space-y-6">
          {Object.entries(agentsByType).map(([type, typeAgents]) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${getAgentColor(type)}`}>
                  {getAgentIcon(type)({ className: "h-4 w-4" })}
                </div>
                <h3 className="text-lg font-semibold text-gray-200">{type.replace(/_/g, ' ')}</h3>
                <Badge variant="secondary" className="ml-2">{typeAgents.length} agents</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(typeAgents as AiAgent[]).map((agent: AiAgent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={() => handleEdit(agent)}
                    onDelete={() => deleteAgent.mutate(agent.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Agent Communication Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full rounded-md border border-gray-700 p-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Real-time message stream will appear here...</p>
                  <p className="text-xs text-gray-600">Connect WebSocket to view agent communications</p>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(agents as AiAgent[]).map((agent: AiAgent) => (
              <Card key={agent.id} className="bg-surface border-gray-700">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {getAgentIcon(agent.type)({ className: "h-4 w-4" })}
                      {agent.name}
                    </span>
                    {getStatusIcon(agent.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Last Ping:</span>
                      <p className="text-gray-300">
                        {agent.lastPing ? new Date(agent.lastPing).toLocaleTimeString() : 'Never'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Response Time:</span>
                      <p className="text-gray-300">{agent.averageResponseTime || 0}ms</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">CPU</span>
                      <span className="text-gray-300">{agent.cpuUsage || 0}%</span>
                    </div>
                    <Progress value={parseFloat(agent.cpuUsage || '0')} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Memory</span>
                      <span className="text-gray-300">{agent.memoryUsage || 0}%</span>
                    </div>
                    <Progress value={parseFloat(agent.memoryUsage || '0')} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}