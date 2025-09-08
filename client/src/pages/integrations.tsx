import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Monitor, 
  Play, 
  Square, 
  Settings, 
  ExternalLink, 
  Shield, 
  Code, 
  Database,
  Download,
  Upload,
  Power,
  PowerOff,
  Activity,
  RefreshCw,
  Globe,
  Search,
  Terminal,
  FileText,
  Eye,
  Container,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Clock,
  Info
} from "lucide-react";

interface IntegrationApp {
  id: string;
  name: string;
  description: string;
  icon: any;
  dockerImage: string;
  port: number;
  status: "running" | "stopped" | "installing";
  category: "security" | "development" | "analysis";
  fileRequired?: string;
  licenseRequired?: boolean;
}

export default function Integrations() {
  const [selectedApp, setSelectedApp] = useState<IntegrationApp | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<any>(null);
  const [containerLogs, setContainerLogs] = useState<string>("");
  const [containerInspect, setContainerInspect] = useState<any>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query Docker containers
  const { data: containers = [] } = useQuery({
    queryKey: ['/api/docker/containers'],
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  // Query Docker info
  const { data: dockerInfo } = useQuery({
    queryKey: ['/api/docker/info'],
    refetchInterval: 5000
  });

  // Type the containers and dockerInfo data
  const containersTyped = containers as any[];
  const dockerInfoTyped = dockerInfo as any;

  // Start container mutation
  const startContainer = useMutation({
    mutationFn: async (app: { appName: string; image: string; port: number }) => {
      return await apiRequest("/api/docker/start-app", "POST", app);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
      toast({
        title: "Success",
        description: "Container started successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start container",
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

  // Mock functions for container operations (would connect to actual Docker API)
  const getContainerLogs = async (containerId: string) => {
    // This would make an API call to get container logs
    const mockLogs = `
2025-01-11T10:30:00.000Z [INFO] Container started
2025-01-11T10:30:01.000Z [INFO] Loading configuration...
2025-01-11T10:30:02.000Z [INFO] Server listening on port 80
2025-01-11T10:30:03.000Z [INFO] Ready to accept connections
2025-01-11T10:30:10.000Z [INFO] Received request from 192.168.1.100
2025-01-11T10:30:11.000Z [INFO] Processing request...
2025-01-11T10:30:12.000Z [INFO] Request completed successfully
    `;
    setContainerLogs(mockLogs);
  };

  const getContainerInspect = async (containerId: string) => {
    // This would make an API call to get container inspect data
    const mockInspect = {
      Id: containerId,
      Created: "2025-01-11T10:30:00.000Z",
      Path: "/docker-entrypoint.sh",
      Args: ["nginx", "-g", "daemon off;"],
      State: {
        Status: "running",
        Running: true,
        Paused: false,
        Restarting: false,
        OOMKilled: false,
        Dead: false,
        Pid: 12345,
        ExitCode: 0,
        Error: "",
        StartedAt: "2025-01-11T10:30:00.000Z",
        FinishedAt: "0001-01-01T00:00:00Z"
      },
      Image: "nginx:alpine",
      ResolvConfPath: "/var/lib/docker/containers/abc123/resolv.conf",
      HostnamePath: "/var/lib/docker/containers/abc123/hostname",
      HostsPath: "/var/lib/docker/containers/abc123/hosts",
      LogPath: "/var/lib/docker/containers/abc123/abc123-json.log",
      Name: "/nginx-test",
      RestartCount: 0,
      Driver: "overlay2",
      Platform: "linux",
      MountLabel: "",
      ProcessLabel: "",
      AppArmorProfile: "",
      ExecIDs: null,
      HostConfig: {
        Binds: null,
        ContainerIDFile: "",
        LogConfig: {
          Type: "json-file",
          Config: {}
        },
        NetworkMode: "default",
        PortBindings: {
          "80/tcp": [
            {
              HostIp: "",
              HostPort: "8080"
            }
          ]
        },
        RestartPolicy: {
          Name: "no",
          MaximumRetryCount: 0
        },
        AutoRemove: false,
        VolumeDriver: "",
        VolumesFrom: null,
        CapAdd: null,
        CapDrop: null,
        CgroupnsMode: "host",
        Dns: [],
        DnsOptions: [],
        DnsSearch: [],
        ExtraHosts: null,
        GroupAdd: null,
        IpcMode: "private",
        Cgroup: "",
        Links: null,
        OomScoreAdj: 0,
        PidMode: "",
        Privileged: false,
        PublishAllPorts: false,
        ReadonlyRootfs: false,
        SecurityOpt: null,
        UTSMode: "",
        UsernsMode: "",
        ShmSize: 67108864,
        Runtime: "runc",
        ConsoleSize: [0, 0],
        Isolation: "",
        CpuShares: 0,
        Memory: 0,
        NanoCpus: 0,
        CgroupParent: "",
        BlkioWeight: 0,
        BlkioWeightDevice: [],
        BlkioDeviceReadBps: null,
        BlkioDeviceWriteBps: null,
        BlkioDeviceReadIOps: null,
        BlkioDeviceWriteIOps: null,
        CpuPeriod: 0,
        CpuQuota: 0,
        CpuRealtimePeriod: 0,
        CpuRealtimeRuntime: 0,
        CpusetCpus: "",
        CpusetMems: "",
        Devices: [],
        DeviceCgroupRules: null,
        DeviceRequests: null,
        KernelMemory: 0,
        KernelMemoryTCP: 0,
        MemoryReservation: 0,
        MemorySwap: 0,
        MemorySwappiness: null,
        OomKillDisable: false,
        PidsLimit: null,
        Ulimits: null,
        CpuCount: 0,
        CpuPercent: 0,
        IOMaximumIOps: 0,
        IOMaximumBandwidth: 0,
        MaskedPaths: [
          "/proc/asound",
          "/proc/acpi",
          "/proc/kcore",
          "/proc/keys",
          "/proc/latency_stats",
          "/proc/timer_list",
          "/proc/timer_stats",
          "/proc/sched_debug",
          "/proc/scsi",
          "/sys/firmware"
        ],
        ReadonlyPaths: [
          "/proc/bus",
          "/proc/fs",
          "/proc/irq",
          "/proc/sys",
          "/proc/sysrq-trigger"
        ]
      },
      GraphDriver: {
        Data: {
          LowerDir: "/var/lib/docker/overlay2/abc123/diff",
          MergedDir: "/var/lib/docker/overlay2/abc123/merged",
          UpperDir: "/var/lib/docker/overlay2/abc123/diff",
          WorkDir: "/var/lib/docker/overlay2/abc123/work"
        },
        Name: "overlay2"
      },
      Mounts: [],
      Config: {
        Hostname: "abc123",
        Domainname: "",
        User: "",
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        ExposedPorts: {
          "80/tcp": {}
        },
        Tty: false,
        OpenStdin: false,
        StdinOnce: false,
        Env: [
          "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          "NGINX_VERSION=1.25.3",
          "NJS_VERSION=0.8.2",
          "PKG_RELEASE=1"
        ],
        Cmd: [
          "nginx",
          "-g",
          "daemon off;"
        ],
        Image: "nginx:alpine",
        Volumes: null,
        WorkingDir: "",
        Entrypoint: [
          "/docker-entrypoint.sh"
        ],
        OnBuild: null,
        Labels: {
          "maintainer": "NGINX Docker Maintainers <docker-maint@nginx.com>"
        },
        StopSignal: "SIGQUIT",
        StopTimeout: 10
      },
      NetworkSettings: {
        Bridge: "",
        SandboxID: "abc123",
        HairpinMode: false,
        LinkLocalIPv6Address: "",
        LinkLocalIPv6PrefixLen: 0,
        Ports: {
          "80/tcp": [
            {
              HostIp: "0.0.0.0",
              HostPort: "8080"
            }
          ]
        },
        SandboxKey: "/var/run/docker/netns/abc123",
        SecondaryIPAddresses: null,
        SecondaryIPv6Addresses: null,
        EndpointID: "abc123",
        Gateway: "172.17.0.1",
        GlobalIPv6Address: "",
        GlobalIPv6PrefixLen: 0,
        IPAddress: "172.17.0.2",
        IPPrefixLen: 16,
        IPv6Gateway: "",
        MacAddress: "02:42:ac:11:00:02",
        Networks: {
          bridge: {
            IPAMConfig: null,
            Links: null,
            Aliases: null,
            NetworkID: "abc123",
            EndpointID: "abc123",
            Gateway: "172.17.0.1",
            IPAddress: "172.17.0.2",
            IPPrefixLen: 16,
            IPv6Gateway: "",
            GlobalIPv6Address: "",
            GlobalIPv6PrefixLen: 0,
            MacAddress: "02:42:ac:11:00:02",
            DriverOpts: null
          }
        }
      }
    };
    setContainerInspect(mockInspect);
  };

  const connectToTerminal = (containerId: string) => {
    // This would open a WebSocket connection to the container's terminal
    setShowTerminal(true);
    toast({
      title: "Terminal",
      description: "Terminal connection would be established in a production environment",
    });
  };

  const integrationApps: IntegrationApp[] = [
    {
      id: "burpsuite",
      name: "Burp Suite Professional",
      description: "Advanced web application security testing",
      icon: Shield,
      dockerImage: "custom/burpsuite-kasmweb",
      port: 6901,
      status: "stopped",
      category: "security",
      fileRequired: "burpsuite_pro.jar",
      licenseRequired: true
    },
    {
      id: "maltego",
      name: "Maltego",
      description: "Open source intelligence and forensics application",
      icon: Search,
      dockerImage: "kasmweb/maltego:1.17.0",
      port: 6902,
      status: "stopped",
      category: "analysis"
    },
    {
      id: "vscode",
      name: "Visual Studio Code",
      description: "Code editor with integrated development environment",
      icon: Code,
      dockerImage: "kasmweb/vs-code:1.17.0",
      port: 6903,
      status: "running",
      category: "development"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-success/10 text-success';
      case 'stopped':
        return 'bg-error/10 text-error';
      case 'installing':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security':
        return 'bg-error/10 text-error';
      case 'development':
        return 'bg-primary/10 text-primary';
      case 'analysis':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const handleStartApp = (app: IntegrationApp) => {
    console.log(`Starting ${app.name}`);
    // Docker start logic would go here
  };

  const handleStopApp = (app: IntegrationApp) => {
    console.log(`Stopping ${app.name}`);
    // Docker stop logic would go here
  };

  const openApp = (app: IntegrationApp) => {
    // In Replit environment, use the proxy URL
    const isReplit = window.location.hostname.includes('.replit.dev') || window.location.hostname.includes('.repl.co');
    if (isReplit) {
      const baseUrl = window.location.origin;
      window.open(`${baseUrl}/proxy/${app.port}/`, '_blank');
    } else {
      window.open(`http://localhost:${app.port}`, '_blank');
    }
  };

  const filteredApps = (category: string) => 
    integrationApps.filter(app => app.category === category);

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Integrations</h2>
            <p className="text-gray-400 mt-1">Containerized security tools and development environments</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-success/10 text-success">
              {integrationApps.filter(app => app.status === 'running').length} Running
            </Badge>
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Settings className="h-4 w-4 mr-2" />
                  Global Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-surface border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-gray-100">Docker Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Docker Host</label>
                    <Input
                      defaultValue="unix:///var/run/docker.sock"
                      className="bg-card border-gray-600 text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Shared Volume Path</label>
                    <Input
                      defaultValue="/home/kali/shared"
                      className="bg-card border-gray-600 text-gray-100"
                    />
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90">
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

        <Tabs defaultValue="docker" className="space-y-6">
          <TabsList className="bg-surface border border-gray-700">
            <TabsTrigger value="docker" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Container className="h-4 w-4 mr-2" />
              Docker Dashboard
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-2" />
              Security Tools
            </TabsTrigger>
            <TabsTrigger value="development" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Code className="h-4 w-4 mr-2" />
              Development
            </TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" />
              Analysis
            </TabsTrigger>
          </TabsList>

          {/* Docker Dashboard */}
          <TabsContent value="docker" className="space-y-6">
            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card className="bg-surface border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Docker Version</p>
                      <p className="text-xl font-bold text-gray-100">{dockerInfoTyped?.version || 'N/A'}</p>
                    </div>
                    <Container className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Running Containers</p>
                      <p className="text-xl font-bold text-success">{dockerInfoTyped?.runningContainers || 0}</p>
                    </div>
                    <Activity className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Images</p>
                      <p className="text-xl font-bold text-gray-100">{dockerInfoTyped?.totalImages || 0}</p>
                    </div>
                    <Database className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">System Status</p>
                      <p className="text-xl font-bold text-success">Healthy</p>
                    </div>
                    <Monitor className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Running Containers */}
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-100">Running Containers</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-gray-600 text-gray-300"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] })}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {containersTyped.length === 0 ? (
                  <div className="text-center py-8">
                    <Container className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No containers running</p>
                    <p className="text-gray-500 text-sm mt-2">Start containers from the other tabs or use the quick actions below</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(containers as any[]).map((container) => (
                      <div key={container.id} className="border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <Container className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="text-gray-100 font-medium">{container.name}</h4>
                              <p className="text-gray-400 text-sm">{container.image}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(container.status)}>
                              {container.status}
                            </Badge>
                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                              Port: {container.port}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-400 mb-4">
                          <div>
                            <span className="block">Container ID</span>
                            <span className="text-gray-300 font-mono">{container.id.substring(0, 12)}</span>
                          </div>
                          <div>
                            <span className="block">Created</span>
                            <span className="text-gray-300">{new Date(container.created).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block">Status</span>
                            <span className="text-gray-300">{container.status}</span>
                          </div>
                          <div>
                            <span className="block">Port Mapping</span>
                            <span className="text-gray-300">{container.port}:80</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            className="bg-primary hover:bg-primary/90 text-white"
                            onClick={() => {
                              const isReplit = window.location.hostname.includes('.replit.dev') || window.location.hostname.includes('.repl.co');
                              if (isReplit) {
                                window.open(`${window.location.origin}/proxy/${container.port}/`, '_blank');
                              } else {
                                window.open(`http://localhost:${container.port}`, '_blank');
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => {
                              setSelectedContainer(container);
                              getContainerLogs(container.id);
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Logs
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => {
                              setSelectedContainer(container);
                              getContainerInspect(container.id);
                            }}
                          >
                            <Info className="h-3 w-3 mr-1" />
                            Inspect
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => connectToTerminal(container.id)}
                          >
                            <Terminal className="h-3 w-3 mr-1" />
                            Terminal
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => stopContainer.mutate(container.name)}
                            disabled={stopContainer.isPending}
                          >
                            <PowerOff className="h-3 w-3 mr-1" />
                            {stopContainer.isPending ? "Stopping..." : "Stop"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-surface border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-100">Quick Start</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-success hover:bg-success/90 text-white justify-start"
                      onClick={() => startContainer.mutate({ appName: "nginx", image: "nginx:alpine", port: 8080 })}
                      disabled={startContainer.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {startContainer.isPending ? "Starting..." : "Start Nginx (Test)"}
                    </Button>
                    
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-white justify-start"
                      onClick={() => startContainer.mutate({ appName: "kali", image: "kasmweb/kali-rolling-desktop:develop", port: 6902 })}
                      disabled={startContainer.isPending}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      {startContainer.isPending ? "Starting..." : "Start Kali Linux"}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-600 text-gray-300 justify-start"
                      onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/docker/info'] });
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh All Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-100">System Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-600 text-gray-300 justify-start"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Clean Up Images
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-600 text-gray-300 justify-start"
                    >
                      <PowerOff className="h-4 w-4 mr-2" />
                      Stop All Containers
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-600 text-gray-300 justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Pull Latest Images
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Container Details Modal */}
            {selectedContainer && (
              <Card className="bg-surface border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-100">
                      Container Details: {selectedContainer.name}
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-gray-600 text-gray-300"
                      onClick={() => {
                        setSelectedContainer(null);
                        setContainerLogs("");
                        setContainerInspect(null);
                      }}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="logs" className="w-full">
                    <TabsList className="bg-card border border-gray-600">
                      <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        <FileText className="h-4 w-4 mr-2" />
                        Logs
                      </TabsTrigger>
                      <TabsTrigger value="inspect" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Info className="h-4 w-4 mr-2" />
                        Inspect
                      </TabsTrigger>
                      <TabsTrigger value="terminal" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Terminal className="h-4 w-4 mr-2" />
                        Terminal
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="logs" className="mt-4">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-gray-100 font-medium">Container Logs</h4>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => getContainerLogs(selectedContainer.id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refresh
                          </Button>
                        </div>
                        <ScrollArea className="h-64 w-full">
                          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                            {containerLogs || "No logs available"}
                          </pre>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="inspect" className="mt-4">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-gray-100 font-medium">Container Inspect Data</h4>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => getContainerInspect(selectedContainer.id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refresh
                          </Button>
                        </div>
                        <ScrollArea className="h-64 w-full">
                          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                            {containerInspect ? JSON.stringify(containerInspect, null, 2) : "Click Refresh to load inspect data"}
                          </pre>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="terminal" className="mt-4">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-gray-100 font-medium">Container Terminal</h4>
                          <Button 
                            size="sm" 
                            className="bg-primary hover:bg-primary/90 text-white"
                            onClick={() => connectToTerminal(selectedContainer.id)}
                          >
                            <Terminal className="h-3 w-3 mr-1" />
                            Connect
                          </Button>
                        </div>
                        <div className="bg-black border border-gray-600 rounded p-4 h-64 overflow-y-auto">
                          <div className="text-green-400 font-mono text-sm">
                            <div className="mb-2">root@{selectedContainer.name.replace('attacknode-', '')}:~# </div>
                            <div className="text-gray-400">
                              {showTerminal ? (
                                <div>
                                  <div>Terminal connection established</div>
                                  <div>Type 'help' for available commands</div>
                                  <div className="mt-2 text-green-400">
                                    root@{selectedContainer.name.replace('attacknode-', '')}:~# <span className="animate-pulse">_</span>
                                  </div>
                                </div>
                              ) : (
                                <div>Click "Connect" to establish terminal connection</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Security Tools */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApps("security").map((app) => (
                <Card key={app.id} className="bg-surface border-gray-700 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <app.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-100">{app.name}</CardTitle>
                          <Badge className={getCategoryColor(app.category)} variant="outline">
                            {app.category}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={getStatusColor(app.status)}>
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm mb-4">{app.description}</p>
                    
                    {app.fileRequired && (
                      <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-warning text-xs">Requires: {app.fileRequired}</p>
                      </div>
                    )}

                    <div className="space-y-2 text-xs text-gray-400 mb-4">
                      <div className="flex justify-between">
                        <span>Port:</span>
                        <span>{app.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Image:</span>
                        <span className="truncate ml-2">{app.dockerImage}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {app.status === 'running' ? (
                        <>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-primary hover:bg-primary/90"
                            onClick={() => openApp(app)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => handleStopApp(app)}
                          >
                            <PowerOff className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-success hover:bg-success/90"
                          onClick={() => handleStartApp(app)}
                        >
                          <Power className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Development Tools */}
          <TabsContent value="development" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApps("development").map((app) => (
                <Card key={app.id} className="bg-surface border-gray-700 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <app.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-100">{app.name}</CardTitle>
                          <Badge className={getCategoryColor(app.category)} variant="outline">
                            {app.category}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={getStatusColor(app.status)}>
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm mb-4">{app.description}</p>

                    <div className="space-y-2 text-xs text-gray-400 mb-4">
                      <div className="flex justify-between">
                        <span>Port:</span>
                        <span>{app.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Image:</span>
                        <span className="truncate ml-2">{app.dockerImage}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {app.status === 'running' ? (
                        <>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-primary hover:bg-primary/90"
                            onClick={() => openApp(app)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => handleStopApp(app)}
                          >
                            <PowerOff className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-success hover:bg-success/90"
                          onClick={() => handleStartApp(app)}
                        >
                          <Power className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analysis Tools */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApps("analysis").map((app) => (
                <Card key={app.id} className="bg-surface border-gray-700 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <app.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-100">{app.name}</CardTitle>
                          <Badge className={getCategoryColor(app.category)} variant="outline">
                            {app.category}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={getStatusColor(app.status)}>
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm mb-4">{app.description}</p>

                    <div className="space-y-2 text-xs text-gray-400 mb-4">
                      <div className="flex justify-between">
                        <span>Port:</span>
                        <span>{app.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Image:</span>
                        <span className="truncate ml-2">{app.dockerImage}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {app.status === 'running' ? (
                        <>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-primary hover:bg-primary/90"
                            onClick={() => openApp(app)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => handleStopApp(app)}
                          >
                            <PowerOff className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-success hover:bg-success/90"
                          onClick={() => handleStartApp(app)}
                        >
                          <Power className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Docker Management */}
        <Card className="bg-surface border-gray-700 mt-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-100">Docker Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="text-gray-100 font-medium">System Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Docker Version:</span>
                    <span className="text-gray-300">24.0.7</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Running Containers:</span>
                    <span className="text-gray-300">{integrationApps.filter(app => app.status === 'running').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Images Pulled:</span>
                    <span className="text-gray-300">{integrationApps.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-gray-100 font-medium">Quick Actions</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 justify-start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Pull Latest Images
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 justify-start">
                    <PowerOff className="h-4 w-4 mr-2" />
                    Stop All Containers
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Clean Up Images
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-gray-100 font-medium">Resource Usage</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400 text-sm">CPU</span>
                      <span className="text-gray-300 text-sm">25%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full">
                      <div className="h-2 bg-warning rounded-full" style={{ width: "25%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400 text-sm">Memory</span>
                      <span className="text-gray-300 text-sm">3.2GB</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full">
                      <div className="h-2 bg-primary rounded-full" style={{ width: "40%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
