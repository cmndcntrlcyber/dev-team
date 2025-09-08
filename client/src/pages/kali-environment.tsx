import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Monitor, 
  Play, 
  Square, 
  Pause, 
  RotateCcw, 
  Settings, 
  ExternalLink, 
  Terminal, 
  Globe, 
  Shield,
  Power,
  PowerOff,
  RefreshCw,
  Download,
  Upload,
  FolderOpen,
  Users,
  Activity
} from "lucide-react";

export default function KaliEnvironment() {
  const [showConfig, setShowConfig] = useState(false);
  const [vncPassword, setVncPassword] = useState("password");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query Docker containers
  const { data: containers = [] } = useQuery({
    queryKey: ['/api/docker/containers'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Start Kali container mutation
  const startKali = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/docker/start-app", "POST", {
        appName: "kali",
        image: "kasmweb/kali-rolling-desktop:develop",
        port: 6902
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
      toast({
        title: "Success",
        description: "Kali Linux container is starting...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start Kali container",
        variant: "destructive",
      });
    }
  });

  // Stop container mutation
  const stopContainer = useMutation({
    mutationFn: async (nameOrId: string) => {
      return await apiRequest(`/api/docker/stop/${nameOrId}`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
      toast({
        title: "Success",
        description: "Container stopped successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop container",
        variant: "destructive",
      });
    }
  });

  const containers_typed = containers as any[];
  const kaliContainer = containers_typed.find((c: any) => c.name === 'attacknode-kali');
  const isRunning = kaliContainer?.status === 'running';
  const containerPort = kaliContainer?.port || 6902;

  const handleStart = () => {
    startKali.mutate();
  };

  const handleStop = () => {
    if (kaliContainer) {
      stopContainer.mutate(kaliContainer.name);
    }
  };

  const handleRestart = async () => {
    if (kaliContainer) {
      await stopContainer.mutateAsync(kaliContainer.name);
      setTimeout(() => startKali.mutate(), 2000);
    }
  };

  const openVNC = () => {
    // In Replit environment, use the proxy URL
    const isReplit = window.location.hostname.includes('.replit.dev') || window.location.hostname.includes('.repl.co');
    if (isReplit) {
      // Replit proxy format: https://bugbounty-command-[username].replit.dev/proxy/[port]/
      const baseUrl = window.location.origin;
      window.open(`${baseUrl}/proxy/${containerPort}/`, '_blank');
    } else {
      window.open(`http://localhost:${containerPort}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Kali Linux Environment</h2>
            <p className="text-gray-400 mt-1">Persistent penetration testing environment via Docker</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className={isRunning ? "bg-success/10 text-success" : "bg-error/10 text-error"}>
              {isRunning ? "Running" : "Stopped"}
            </Badge>
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-gray-600 text-gray-300">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-surface border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-gray-100">Environment Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">VNC Password</label>
                    <Input
                      value={vncPassword}
                      onChange={(e) => setVncPassword(e.target.value)}
                      type="password"
                      className="bg-card border-gray-600 text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Container Port</label>
                    <Input
                      value={containerPort}
                      disabled
                      className="bg-card border-gray-600 text-gray-100"
                    />
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                    Save Configuration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Environment Status */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100 flex items-center">
                <Monitor className="h-5 w-5 mr-2" />
                Environment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  <Badge className={
                    isRunning ? "bg-success/10 text-success" :
                    kaliContainer?.status === 'error' ? "bg-error/10 text-error" :
                    "bg-gray-500/10 text-gray-500"
                  }>
                    {kaliContainer?.status || 'Not Started'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Port</span>
                  <span className="text-gray-300">{containerPort}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Image</span>
                  <span className="text-gray-300 text-xs">kasmweb/kali-rolling</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Container</span>
                  <span className="text-gray-300 text-xs">{kaliContainer?.name || 'attacknode-kali'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!isRunning ? (
                  <Button 
                    onClick={handleStart}
                    className="w-full bg-success hover:bg-success/90 text-white"
                    disabled={startKali.isPending}
                  >
                    <Power className="h-4 w-4 mr-2" />
                    {startKali.isPending ? "Starting..." : "Start Environment"}
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={openVNC}
                      className="w-full bg-primary hover:bg-primary/90 text-white"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open VNC Desktop
                    </Button>
                    <Button 
                      onClick={handleRestart}
                      variant="outline" 
                      className="w-full border-gray-600 text-gray-300"
                      disabled={stopContainer.isPending || startKali.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restart
                    </Button>
                    <Button 
                      onClick={handleStop}
                      variant="destructive" 
                      className="w-full"
                      disabled={stopContainer.isPending}
                    >
                      <PowerOff className="h-4 w-4 mr-2" />
                      {stopContainer.isPending ? "Stopping..." : "Stop Environment"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Resource Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">CPU</span>
                    <span className="text-gray-300 text-sm">15%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full">
                    <div className="h-2 bg-primary rounded-full" style={{ width: "15%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Memory</span>
                    <span className="text-gray-300 text-sm">24%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full">
                    <div className="h-2 bg-warning rounded-full" style={{ width: "24%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Disk</span>
                    <span className="text-gray-300 text-sm">8%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full">
                    <div className="h-2 bg-success rounded-full" style={{ width: "8%" }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Container Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Container Integration */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100">Container Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-card rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-100">AI Agent Integration</h4>
                    <Badge className="bg-primary/10 text-primary">MCP Ready</Badge>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    AI agents can directly execute commands and tools within this Kali environment through the MCP (Model Context Protocol) integration.
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-gray-600 text-gray-300 w-full"
                    onClick={() => window.location.href = '/ai-agents'}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Configure AI Agents
                  </Button>
                </div>

                <div className="bg-card rounded-lg p-4">
                  <h4 className="font-medium text-gray-100 mb-3">Available Tools</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <Terminal className="h-3 w-3 mr-2 text-primary" />
                      <span className="text-gray-300">Terminal Access</span>
                    </div>
                    <div className="flex items-center">
                      <Shield className="h-3 w-3 mr-2 text-primary" />
                      <span className="text-gray-300">Security Tools</span>
                    </div>
                    <div className="flex items-center">
                      <Globe className="h-3 w-3 mr-2 text-primary" />
                      <span className="text-gray-300">Web Browser</span>
                    </div>
                    <div className="flex items-center">
                      <Monitor className="h-3 w-3 mr-2 text-primary" />
                      <span className="text-gray-300">Desktop GUI</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Management */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100">File Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                  <div className="flex items-center">
                    <FolderOpen className="h-5 w-5 text-primary mr-3" />
                    <div>
                      <p className="text-gray-100 font-medium">/home/kali</p>
                      <p className="text-gray-400 text-sm">User directory</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-gray-600 text-gray-300"
                    onClick={() => window.location.href = '/file-manager'}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="border-gray-600 text-gray-300"
                    onClick={() => window.location.href = '/file-manager'}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-gray-600 text-gray-300"
                    onClick={() => window.location.href = '/file-manager'}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                
                <div className="p-3 bg-card rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Persistent Volume</p>
                  <p className="text-gray-100">All files are automatically saved</p>
                  <p className="text-gray-400 text-xs">Located at: /persistent-data</p>
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-600 text-gray-300"
                    onClick={() => window.location.href = '/containers'}
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Manage All Containers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Docker Configuration */}
        <Card className="bg-surface border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-100">Docker Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-card p-4 rounded-lg">
                <h4 className="text-gray-100 font-medium mb-2">Current Configuration</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Image:</span>
                    <span className="text-gray-300">kasmweb/kali-rolling-desktop:develop</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Port Mapping:</span>
                    <span className="text-gray-300">{containerPort}:6901</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Memory Limit:</span>
                    <span className="text-gray-300">4GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Shared Memory:</span>
                    <span className="text-gray-300">512MB</span>
                  </div>
                </div>
              </div>

              <div className="bg-card p-4 rounded-lg">
                <h4 className="text-gray-100 font-medium mb-2">Docker Command</h4>
                <code className="text-xs text-gray-400 bg-gray-800 p-2 rounded block font-mono">
                  docker run --rm -it --shm-size=512m -p {containerPort}:6901 -e VNC_PW={vncPassword} -v /persistent-data:/home/kali/data kasmweb/kali-rolling-desktop:develop
                </code>
              </div>

              <div className="flex gap-3">
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Image
                </Button>
                <Button variant="outline" className="border-gray-600 text-gray-300">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Docker Status Message */}
        <div className="mt-6">
          {startKali.error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <p className="text-error font-medium mb-2">Docker Container Status</p>
              <p className="text-gray-300 text-sm">
                Docker is not available in this development environment. In a production environment with Docker installed, 
                the Kali Linux container would start successfully.
              </p>
            </div>
          )}
          {!startKali.error && !isRunning && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <p className="text-warning font-medium mb-2">Getting Started</p>
              <p className="text-gray-300 text-sm">
                Click "Start Environment" to launch a persistent Kali Linux desktop environment with all penetration testing tools pre-installed.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
