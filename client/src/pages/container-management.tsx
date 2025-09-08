import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Monitor, 
  Play, 
  Square, 
  RotateCcw, 
  ExternalLink, 
  Terminal, 
  FileText,
  Search,
  Power,
  PowerOff,
  Crown,
  Shield,
  Code,
  Database,
  Server,
  Network,
  Activity,
  AlertCircle,
  CheckCircle,
  Pause
} from "lucide-react";

const getContainerIcon = (config: any) => {
  const iconMap: any = {
    kali: Shield,
    vscode: Code,
    empire: Crown,
    bbot: Search,
    maltego: Network,
    postgres: Database,
    redis: Database,
    sysreptor: FileText,
    caddy: Server
  };
  return iconMap[config.name] || Monitor;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'security':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'development':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'analysis':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'infrastructure':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

export default function ContainerManagement() {
  const [selectedContainer, setSelectedContainer] = useState<any>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showInspect, setShowInspect] = useState(false);
  const [logs, setLogs] = useState('');
  const [inspectData, setInspectData] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query container configs and status
  const { data: containerConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ["/api/docker/configs"],
  });

  const { data: containers = [], isLoading: containersLoading } = useQuery({
    queryKey: ["/api/docker/containers"],
    refetchInterval: 10000, // Refresh every 10 seconds (reduced from 5)
    staleTime: 8000, // Consider data fresh for 8 seconds
    gcTime: 30000, // Keep in cache for 30 seconds (renamed from cacheTime)
    retry: 2, // Retry failed requests 2 times
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true // Refetch when connection is restored
  });

  // Start container mutation
  const startContainer = useMutation({
    mutationFn: async (containerName: string) => {
      return await apiRequest(`/api/docker/start/${containerName}`, "POST");
    },
    onSuccess: (data, containerName) => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
      toast({
        title: "Success",
        description: `${containerName} container is starting...`,
      });
    },
    onError: (error: any, containerName) => {
      toast({
        title: "Error",
        description: `Failed to start ${containerName}: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Stop container mutation
  const stopContainer = useMutation({
    mutationFn: async (containerName: string) => {
      return await apiRequest(`/api/docker/stop/attacknode-${containerName}`, "POST");
    },
    onSuccess: (data, containerName) => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
      toast({
        title: "Success",
        description: `${containerName} container stopped successfully`,
      });
    },
    onError: (error: any, containerName) => {
      toast({
        title: "Error",
        description: `Failed to stop ${containerName}: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Restart container mutation
  const restartContainer = useMutation({
    mutationFn: async (containerName: string) => {
      return await apiRequest(`/api/docker/restart/${containerName}`, "POST");
    },
    onSuccess: (data, containerName) => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
      toast({
        title: "Success",
        description: `${containerName} container restarted successfully`,
      });
    },
    onError: (error: any, containerName) => {
      toast({
        title: "Error",
        description: `Failed to restart ${containerName}: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Get container logs with SSE streaming
  const getContainerLogs = async (containerName: string) => {
    try {
      setLogs('Connecting to log stream...\n');
      setSelectedContainer(containerName);
      setShowLogs(true);

      // Start SSE connection
      const eventSource = new EventSource(`/api/docker/logs/${containerName}/stream`);
      
      eventSource.onopen = () => {
        setLogs('Connected to log stream\n');
      };

      eventSource.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          const timestamp = new Date(logData.timestamp).toLocaleTimeString();
          const logLine = `[${timestamp}] ${logData.message}\n`;
          
          setLogs(prevLogs => prevLogs + logLine);
        } catch (error) {
          // Fallback for non-JSON messages
          setLogs(prevLogs => prevLogs + event.data + '\n');
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setLogs(prevLogs => prevLogs + '\n[ERROR] Connection lost\n');
        eventSource.close();
      };

      // Store the event source to close it when modal closes
      (window as any).currentLogStream = eventSource;

    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to start log stream: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Close log stream when modal closes
  const handleLogsDialogClose = (open: boolean) => {
    if (!open && (window as any).currentLogStream) {
      (window as any).currentLogStream.close();
      (window as any).currentLogStream = null;
    }
    setShowLogs(open);
  };

  // Inspect container
  const inspectContainer = async (containerName: string) => {
    try {
      const response = await apiRequest(`/api/docker/inspect/${containerName}`, "GET") as any;
      setInspectData(response);
      setSelectedContainer(containerName);
      setShowInspect(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to inspect container: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Open container in new tab
  const openContainer = (config: any) => {
    const containersList = Array.isArray(containers) ? containers : [];
    const container = containersList.find((c: any) => c.name === `attacknode-${config.name}`);
    if (container?.status === 'running') {
      // Special handling for different container types
      if (config.name === 'kali') {
        window.location.href = '/kali-environment';
      } else if (config.name === 'vscode') {
        window.open(`https://localhost:${config.port}`, '_blank');
      } else if (config.name === 'sysreptor') {
        window.open(`https://localhost:${config.port}`, '_blank');
      } else {
        window.open(`https://localhost:${config.port}`, '_blank');
      }
    }
  };

  const containersList = Array.isArray(containers) ? containers : [];
  const configsList = Array.isArray(containerConfigs) ? containerConfigs : [];

  // Group containers by category
  const containersByCategory = configsList.reduce((acc: any, config: any) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Container Management</h2>
            <p className="text-gray-400 mt-1">Manage all security testing containers</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm text-gray-300">
                {containersList.filter((c: any) => c.status === 'running').length} Running
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="text-sm text-gray-300">
                {configsList.length - containersList.filter((c: any) => c.status === 'running').length} Stopped
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Container Categories */}
        <div className="space-y-8">
          {Object.entries(containersByCategory).map(([category, configs]: [string, any]) => (
            <div key={category}>
              <h3 className="text-xl font-semibold text-gray-100 mb-4 capitalize flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                {category === 'security' ? 'Security Tools' : 
                 category === 'development' ? 'Development Tools' :
                 category === 'analysis' ? 'Analysis Tools' :
                 category === 'infrastructure' ? 'Infrastructure Services' : category}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configs.map((config: any) => {
                  const container = containersList.find((c: any) => c.name === `attacknode-${config.name}`);
                  const isRunning = container?.status === 'running';
                  const Icon = getContainerIcon(config);

                  return (
                    <Card key={config.name} className="bg-surface border-gray-700">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold text-gray-100">
                                {config.name}
                              </CardTitle>
                              <Badge className={getCategoryColor(config.category)}>
                                {config.category}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {isRunning ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-300 mb-2">{config.description}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-400">Port:</span>
                                <span className="text-gray-100 ml-1">{config.port}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Status:</span>
                                <span className={`ml-1 ${isRunning ? 'text-success' : 'text-gray-500'}`}>
                                  {container?.status || 'stopped'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Container Controls */}
                          <div className="space-y-2">
                            {/* Primary Actions */}
                            <div className="flex space-x-2">
                              {!isRunning ? (
                                <Button
                                  onClick={() => startContainer.mutate(config.name)}
                                  className="flex-1 bg-success hover:bg-success/90 text-white"
                                  disabled={startContainer.isPending}
                                >
                                  <Play className="h-3 w-3 mr-2" />
                                  {startContainer.isPending ? 'Starting...' : 'Start'}
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => openContainer(config)}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-2" />
                                    Open
                                  </Button>
                                  <Button
                                    onClick={() => stopContainer.mutate(config.name)}
                                    variant="destructive"
                                    className="flex-1"
                                    disabled={stopContainer.isPending}
                                  >
                                    <Square className="h-3 w-3 mr-2" />
                                    {stopContainer.isPending ? 'Stopping...' : 'Stop'}
                                  </Button>
                                </>
                              )}
                            </div>

                            {/* Secondary Actions */}
                            {isRunning && (
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  onClick={() => getContainerLogs(config.name)}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-600 text-gray-300"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Logs
                                </Button>
                                <Button
                                  onClick={() => inspectContainer(config.name)}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-600 text-gray-300"
                                >
                                  <Search className="h-3 w-3 mr-1" />
                                  Inspect
                                </Button>
                                <Button
                                  onClick={() => restartContainer.mutate(config.name)}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-600 text-gray-300"
                                  disabled={restartContainer.isPending}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Restart
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Container Info */}
                          <div className="bg-card rounded-lg p-3">
                            <div className="text-xs text-gray-400 space-y-1">
                              <div>Image: {config.image}</div>
                              {config.additionalPorts && (
                                <div>Additional Ports: {config.additionalPorts.join(', ')}</div>
                              )}
                              {container?.id && (
                                <div>ID: {container.id.substring(0, 12)}...</div>
                              )}
                              {container?.created && (
                                <div>Created: {new Date(container.created).toLocaleString()}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-surface border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-100">
              Container Logs - {selectedContainer}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full">
            <pre className="text-xs text-gray-300 bg-gray-900 p-4 rounded-lg font-mono whitespace-pre-wrap">
              {logs}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Inspect Dialog */}
      <Dialog open={showInspect} onOpenChange={setShowInspect}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-surface border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-100">
              Container Inspection - {selectedContainer}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full">
            <pre className="text-xs text-gray-300 bg-gray-900 p-4 rounded-lg font-mono whitespace-pre-wrap">
              {JSON.stringify(inspectData, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
