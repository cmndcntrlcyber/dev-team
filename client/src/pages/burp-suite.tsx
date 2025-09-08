import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Play, 
  Square, 
  Settings, 
  ExternalLink, 
  Target, 
  Bug,
  Activity,
  Database,
  FileText,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Terminal
} from "lucide-react";

export default function BurpSuite() {
  const [isScanning, setIsScanning] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [jarFile, setJarFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [isHeadlessMode, setIsHeadlessMode] = useState(false);
  const queryClient = useQueryClient();

  // Query Docker containers
  const { data: containers = [] } = useQuery({
    queryKey: ['/api/docker/containers'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Start Burp Suite mutation (GUI mode)
  const startBurpSuite = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (jarFile) formData.append('jar', jarFile);
      if (licenseFile) formData.append('license', licenseFile);
      
      const response = await fetch("/api/docker/start-burpsuite", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("Failed to start Burp Suite");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
    }
  });

  // Start Headless Burp Suite mutation
  const startHeadlessBurpSuite = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (jarFile) formData.append('jar', jarFile);
      if (licenseFile) formData.append('license', licenseFile);
      
      const response = await fetch("/api/docker/start-headless-burpsuite", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start headless Burp Suite");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
    }
  });

  // Start other apps mutation
  const startApp = useMutation({
    mutationFn: async (app: { appName: string; image: string; port: number }) => {
      return await apiRequest("/api/docker/start-app", "POST", app);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
    }
  });

  // Stop container mutation
  const stopContainer = useMutation({
    mutationFn: async (nameOrId: string) => {
      return await apiRequest(`/api/docker/stop/${nameOrId}`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/docker/containers'] });
    }
  });

  const containers_typed = containers as any[];
  const burpContainer = containers_typed.find((c: any) => 
    c.name === 'attacknode-burpsuite' || c.name === 'attacknode-burpsuite-headless'
  );
  const isBurpRunning = burpContainer?.status === 'running';
  const isHeadlessBurp = burpContainer?.name === 'attacknode-burpsuite-headless';

  // TODO: Integrate with actual Burp Suite API for real scan results and projects
  const scanResults: any[] = [];
  const projects: any[] = [];

  const handleStartScan = () => {
    if (targetUrl) {
      setIsScanning(true);
      // Here we would integrate with Burp Suite API to start a scan
      setTimeout(() => setIsScanning(false), 5000); // Simulate scan completion
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    // Here we would stop the scan via Burp Suite API
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-error/10 text-error';
      case 'medium':
        return 'bg-warning/10 text-warning';
      case 'low':
        return 'bg-success/10 text-success';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-error/10 text-error';
      case 'fixed':
        return 'bg-success/10 text-success';
      case 'acknowledged':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Burp Suite Integration</h2>
            <p className="text-gray-400 mt-1">Advanced web application security testing</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className={isScanning ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}>
              {isScanning ? "Scanning" : "Ready"}
            </Badge>
            <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Target className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-surface border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-gray-100">Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Project Name</label>
                    <Input
                      placeholder="Enter project name"
                      className="bg-card border-gray-600 text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Target URL</label>
                    <Input
                      placeholder="https://example.com"
                      className="bg-card border-gray-600 text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Description</label>
                    <Textarea
                      placeholder="Project description..."
                      className="bg-card border-gray-600 text-gray-100"
                    />
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                    Create Project
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Quick Scan Panel */}
        <Card className="bg-surface border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-100">Quick Scan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter target URL (e.g., https://example.com)"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="bg-card border-gray-600 text-gray-100"
                />
              </div>
              {!isScanning ? (
                <Button 
                  onClick={handleStartScan}
                  disabled={!targetUrl}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Scan
                </Button>
              ) : (
                <Button 
                  onClick={handleStopScan}
                  variant="destructive"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Scan
                </Button>
              )}
            </div>
            {isScanning && (
              <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center">
                  <Activity className="h-4 w-4 text-warning mr-2 animate-pulse" />
                  <span className="text-warning">Scanning in progress...</span>
                </div>
                <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-warning h-2 rounded-full animate-pulse" style={{ width: "45%" }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Findings</p>
                  <p className="text-2xl font-bold text-gray-100 mt-2">{scanResults.length}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Bug className="text-primary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">High Severity</p>
                  <p className="text-2xl font-bold text-error mt-2">
                    {scanResults.filter(r => r.severity?.toLowerCase() === 'high').length}
                  </p>
                </div>
                <div className="bg-error/10 p-3 rounded-lg">
                  <AlertTriangle className="text-error h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Fixed Issues</p>
                  <p className="text-2xl font-bold text-success mt-2">
                    {scanResults.filter(r => r.status?.toLowerCase() === 'fixed').length}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-lg">
                  <CheckCircle className="text-success h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Scan Time</p>
                  <p className="text-2xl font-bold text-gray-100 mt-2">
                    {isScanning ? "Running..." : "0m"}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <Clock className="text-secondary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Findings */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-100">Recent Findings</CardTitle>
                <Button variant="link" className="text-primary hover:text-primary/80 p-0">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {scanResults.length === 0 ? (
                <div className="text-center py-8">
                  <Bug className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No scan results yet</p>
                  <p className="text-gray-500 text-sm mt-2">Run a scan to see vulnerability findings</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scanResults.map((result) => (
                    <div key={result.id} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-gray-100 font-medium">{result.title}</h4>
                          <p className="text-gray-400 text-sm mt-1">{result.url}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge className={getSeverityColor(result.severity)}>
                            {result.severity}
                          </Badge>
                          <Badge className={getStatusColor(result.status)} variant="outline">
                            {result.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Confidence: {result.confidence}</span>
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-100">Active Projects</CardTitle>
                <Button variant="link" className="text-primary hover:text-primary/80 p-0">
                  Manage
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No active projects</p>
                  <p className="text-gray-500 text-sm mt-2">Create a new project to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-gray-100 font-medium">{project.name}</h4>
                          <p className="text-gray-400 text-sm">{project.target}</p>
                        </div>
                        <Badge className={project.status === 'Active' ? 'bg-success/10 text-success' : 'bg-gray-500/10 text-gray-500'}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{project.findings} findings</span>
                        <span className="text-gray-400">
                          {new Date(project.lastScan).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>


        {/* Burp Suite Docker Integration */}
        <Card className="bg-surface border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-100">Burp Suite Professional Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-card p-4 rounded-lg">
                  <h4 className="text-gray-100 font-medium mb-2">Docker Container Status</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Burp Suite Container</span>
                    <Badge className={
                      burpContainer?.status === 'running' ? 'bg-success/10 text-success' :
                      burpContainer?.status === 'error' ? 'bg-error/10 text-error' :
                      'bg-gray-500/10 text-gray-500'
                    }>
                      {burpContainer?.status || 'Not Started'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-400">Port</span>
                    <span className="text-gray-300">{isHeadlessMode ? '8080' : '6901'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-400">Mode</span>
                    <span className="text-gray-300">{isHeadlessMode ? 'Headless' : 'GUI (VNC)'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-400">JAR File</span>
                    <span className="text-gray-300">{jarFile ? jarFile.name : 'Not uploaded'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-400">License File</span>
                    <span className="text-gray-300">{licenseFile ? licenseFile.name : 'Not uploaded'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Burp Suite JAR File</label>
                    <Input
                      type="file"
                      accept=".jar"
                      onChange={(e) => setJarFile(e.target.files?.[0] || null)}
                      className="bg-card border-gray-600 text-gray-100"
                    />
                    {jarFile && (
                      <p className="text-xs text-success mt-1">Selected: {jarFile.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">License File (Optional)</label>
                    <Input
                      type="file"
                      accept=".txt,.license"
                      onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                      className="bg-card border-gray-600 text-gray-100"
                    />
                    {licenseFile && (
                      <p className="text-xs text-success mt-1">Selected: {licenseFile.name}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-4 p-3 bg-card rounded-lg">
                    <Switch
                      id="headless-mode"
                      checked={isHeadlessMode}
                      onCheckedChange={setIsHeadlessMode}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="headless-mode" className="text-gray-300 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <Terminal className="h-4 w-4" />
                        <span>Headless Mode</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Run Burp Suite without GUI (uses volume mapping with java -jar command)
                      </p>
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-card p-4 rounded-lg">
                  <h4 className="text-gray-100 font-medium mb-2">Quick Actions</h4>
                  <div className="space-y-3">
                    {!isBurpRunning ? (
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90"
                        onClick={() => {
                          if (isHeadlessMode) {
                            startHeadlessBurpSuite.mutate();
                          } else {
                            startBurpSuite.mutate();
                          }
                        }}
                        disabled={startBurpSuite.isPending || startHeadlessBurpSuite.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {startBurpSuite.isPending || startHeadlessBurpSuite.isPending ? "Starting..." : "Start Burp Suite"}
                      </Button>
                    ) : (
                      <>
                        {!isHeadlessBurp && (
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90"
                            onClick={() => {
                              // In Replit environment, use the proxy URL
                              const isReplit = window.location.hostname.includes('.replit.dev') || window.location.hostname.includes('.repl.co');
                              if (isReplit) {
                                const baseUrl = window.location.origin;
                                window.open(`${baseUrl}/proxy/${burpContainer?.port}/`, '_blank');
                              } else {
                                window.open(`http://localhost:${burpContainer?.port}`, '_blank');
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Web Interface
                          </Button>
                        )}
                        {isHeadlessBurp && (
                          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                            <p className="text-success text-sm font-medium">Headless Burp Suite Running</p>
                            <p className="text-gray-400 text-xs mt-1">
                              Proxy available on port {burpContainer?.port || '8080'}
                            </p>
                          </div>
                        )}
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          onClick={() => stopContainer.mutate(burpContainer?.name)}
                          disabled={stopContainer.isPending}
                        >
                          <Square className="h-4 w-4 mr-2" />
                          {stopContainer.isPending ? "Stopping..." : "Stop Container"}
                        </Button>
                      </>
                    )}
                    <Button variant="outline" className="w-full border-gray-600 text-gray-300">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Settings
                    </Button>
                  </div>
                </div>

                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                  <p className="text-warning text-sm">
                    {isHeadlessMode 
                      ? "Headless mode runs Burp Suite without GUI using Docker volume mapping with java -jar command"
                      : "GUI mode provides web-based VNC access to Burp Suite Professional interface"}
                  </p>
                  {(startBurpSuite.error || startHeadlessBurpSuite.error) && (
                    <p className="text-error text-sm mt-2">
                      {startBurpSuite.error?.message || startHeadlessBurpSuite.error?.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Burp Suite Web Interface */}
        <Card className="bg-surface border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-100">Burp Suite Web Interface</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-card rounded-lg p-4">
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-100 mb-2">Burp Suite Not Running</h3>
                <p className="text-gray-400 mb-6">
                  Start the Burp Suite container to access the web interface
                </p>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Play className="h-4 w-4 mr-2" />
                  Launch Burp Suite
                </Button>
              </div>
              {/* When running, this would contain an iframe to the Burp Suite web interface */}
              {/* <iframe 
                src="http://localhost:6901/vnc.html?autoconnect=true" 
                className="w-full h-96 border-0 rounded"
                title="Burp Suite Professional"
              /> */}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
