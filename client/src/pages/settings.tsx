import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Database, 
  Bell, 
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  Key,
  Globe,
  Monitor
} from "lucide-react";

// Integration Status Component
function IntegrationStatusList() {
  const { data: integrationStatus, refetch } = useQuery({
    queryKey: ['/api/integrations/status'],
    queryFn: async () => {
      const response = await fetch('/api/integrations/status');
      if (response.ok) {
        return response.json();
      }
      return {};
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">Connected</div>;
      case "running":
        return <div className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">Running</div>;
      case "disconnected":
      default:
        return <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">Disconnected</div>;
    }
  };

  const getIcon = (name: string) => {
    switch (name) {
      case "OpenAI":
      case "Anthropic":
        return <Globe className="h-5 w-5 text-primary mr-3" />;
      case "Burp Suite":
        return <Shield className="h-5 w-5 text-secondary mr-3" />;
      case "Kali Linux":
        return <Monitor className="h-5 w-5 text-warning mr-3" />;
      default:
        return <Globe className="h-5 w-5 text-gray-400 mr-3" />;
    }
  };

  return (
    <div className="space-y-4">
      {integrationStatus?.openai && (
        <div className="flex items-center justify-between p-3 bg-card rounded-lg">
          <div className="flex items-center">
            {getIcon(integrationStatus.openai.name)}
            <div>
              <p className="text-gray-100 font-medium">{integrationStatus.openai.name}</p>
              <p className="text-gray-400 text-sm">{integrationStatus.openai.description}</p>
            </div>
          </div>
          {getStatusBadge(integrationStatus.openai.status)}
        </div>
      )}

      {integrationStatus?.anthropic && (
        <div className="flex items-center justify-between p-3 bg-card rounded-lg">
          <div className="flex items-center">
            {getIcon(integrationStatus.anthropic.name)}
            <div>
              <p className="text-gray-100 font-medium">{integrationStatus.anthropic.name}</p>
              <p className="text-gray-400 text-sm">{integrationStatus.anthropic.description}</p>
            </div>
          </div>
          {getStatusBadge(integrationStatus.anthropic.status)}
        </div>
      )}

      {integrationStatus?.burp && (
        <div className="flex items-center justify-between p-3 bg-card rounded-lg">
          <div className="flex items-center">
            {getIcon(integrationStatus.burp.name)}
            <div>
              <p className="text-gray-100 font-medium">{integrationStatus.burp.name}</p>
              <p className="text-gray-400 text-sm">{integrationStatus.burp.description}</p>
            </div>
          </div>
          {getStatusBadge(integrationStatus.burp.status)}
        </div>
      )}

      {integrationStatus?.kali && (
        <div className="flex items-center justify-between p-3 bg-card rounded-lg">
          <div className="flex items-center">
            {getIcon(integrationStatus.kali.name)}
            <div>
              <p className="text-gray-100 font-medium">{integrationStatus.kali.name}</p>
              <p className="text-gray-400 text-sm">{integrationStatus.kali.description}</p>
            </div>
          </div>
          {getStatusBadge(integrationStatus.kali.status)}
        </div>
      )}
      
      <Button 
        variant="outline" 
        onClick={() => refetch()}
        className="border-gray-600 text-gray-300 w-full mt-4"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh Status
      </Button>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState({
    emailReports: true,
    newVulnerabilities: true,
    systemAlerts: false,
    weeklyDigest: true
  });

  const [apiSettings, setApiSettings] = useState({
    openaiApiKey: "",
    anthropicApiKey: "",
    githubToken: "",
    jenkinsEndpoint: "http://localhost:8080",
    cloudflareToken: ""
  });

  const [userProfile, setUserProfile] = useState({
    username: "security_researcher",
    email: "researcher@example.com",
    timezone: "UTC",
    theme: "dark"
  });

  // Load configurations on mount
  const { data: profileConfig } = useQuery({
    queryKey: ['/api/config/profile'],
    queryFn: async () => {
      const response = await fetch('/api/config/profile');
      if (response.ok) {
        return response.json();
      }
      return {};
    }
  });

  const { data: apiConfig } = useQuery({
    queryKey: ['/api/config/api'],
    queryFn: async () => {
      const response = await fetch('/api/config/api');
      if (response.ok) {
        return response.json();
      }
      return {};
    }
  });

  const { data: notificationConfig } = useQuery({
    queryKey: ['/api/config/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/config/notifications');
      if (response.ok) {
        return response.json();
      }
      return {};
    }
  });

  // Update state when configs are loaded
  useEffect(() => {
    if (profileConfig && Object.keys(profileConfig).length > 0) {
      setUserProfile(prev => ({ ...prev, ...profileConfig }));
    }
  }, [profileConfig]);

  useEffect(() => {
    if (apiConfig && Object.keys(apiConfig).length > 0) {
      setApiSettings(prev => ({ ...prev, ...apiConfig }));
    }
  }, [apiConfig]);

  useEffect(() => {
    if (notificationConfig && Object.keys(notificationConfig).length > 0) {
      setNotifications(prev => ({ ...prev, ...notificationConfig }));
    }
  }, [notificationConfig]);

  // Save mutations
  const saveProfile = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/config/profile", "POST", userProfile);
    },
    onSuccess: () => {
      toast({
        title: "Profile Saved",
        description: "Your profile settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile settings.",
        variant: "destructive",
      });
    }
  });

  const saveNotifications = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/config/notifications", "POST", notifications);
    },
    onSuccess: () => {
      toast({
        title: "Notifications Saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      });
    }
  });

  const saveApiSettings = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/config/api", "POST", apiSettings);
    },
    onSuccess: () => {
      toast({
        title: "API Settings Saved",
        description: "Your API configuration has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save API settings.",
        variant: "destructive",
      });
    }
  });

  const handleSaveProfile = () => {
    saveProfile.mutate();
  };

  const handleSaveNotifications = () => {
    saveNotifications.mutate();
  };

  const handleSaveApiSettings = () => {
    saveApiSettings.mutate();
  };

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/export-data');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dev-team-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const response = await fetch('/api/import-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          const result = await response.json();
          toast({
            title: "Import Successful",
            description: `Imported ${result.itemsImported} items successfully.`,
          });
          // Refresh data
          window.location.reload();
        } else {
          throw new Error('Import failed');
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to import data. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Settings</h2>
            <p className="text-gray-400 mt-1">Configure your Dev Team platform</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleExportData} className="border-gray-600 text-gray-300">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" onClick={handleImportData} className="border-gray-600 text-gray-300">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-surface border border-gray-700">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Key className="h-4 w-4 mr-2" />
              API & Integrations
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Database className="h-4 w-4 mr-2" />
              Data Management
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-100">User Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Username</label>
                    <Input
                      value={userProfile.username}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, username: e.target.value }))}
                      className="bg-card border-gray-600 text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Email</label>
                    <Input
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-card border-gray-600 text-gray-100"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Timezone</label>
                    <Select value={userProfile.timezone} onValueChange={(value) => setUserProfile(prev => ({ ...prev, timezone: value }))}>
                      <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Theme</label>
                    <Select value={userProfile.theme} onValueChange={(value) => setUserProfile(prev => ({ ...prev, theme: value }))}>
                      <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} className="bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API & Integrations */}
          <TabsContent value="api" className="space-y-6">
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-100">API Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">OpenAI API Key</label>
                  <Input
                    type="password"
                    value={apiSettings.openaiApiKey}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="bg-card border-gray-600 text-gray-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">Used for AI-powered vulnerability analysis and report generation</p>
                </div>

                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Anthropic API Key</label>
                  <Input
                    type="password"
                    value={apiSettings.anthropicApiKey}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, anthropicApiKey: e.target.value }))}
                    placeholder="sk-ant-..."
                    className="bg-card border-gray-600 text-gray-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">Used for Claude AI integration in multi-agent workflows</p>
                </div>

                <Separator className="bg-gray-700" />

                <Separator className="bg-gray-700" />

                <div>
                  <label className="text-sm text-gray-300 mb-2 block">GitHub Token</label>
                  <Input
                    type="password"
                    value={apiSettings.githubToken || ""}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, githubToken: e.target.value }))}
                    placeholder="ghp_..."
                    className="bg-card border-gray-600 text-gray-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">Personal access token for GitHub integration (repo access)</p>
                </div>

                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Jenkins Endpoint</label>
                  <Input
                    value={apiSettings.jenkinsEndpoint || "http://localhost:8080"}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, jenkinsEndpoint: e.target.value }))}
                    placeholder="http://localhost:8080"
                    className="bg-card border-gray-600 text-gray-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">Jenkins CI/CD server endpoint</p>
                </div>

                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Cloudflare API Token</label>
                  <Input
                    type="password"
                    value={apiSettings.cloudflareToken || ""}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, cloudflareToken: e.target.value }))}
                    placeholder="..."
                    className="bg-card border-gray-600 text-gray-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">API token for Cloudflare CDN and DNS management</p>
                </div>

                <Button onClick={handleSaveApiSettings} className="bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save API Settings
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-100">Integration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <IntegrationStatusList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-100">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-100 font-medium">Email Reports</p>
                    <p className="text-gray-400 text-sm">Receive vulnerability reports via email</p>
                  </div>
                  <Switch
                    checked={notifications.emailReports}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailReports: checked }))}
                  />
                </div>

                <Separator className="bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-100 font-medium">New Vulnerabilities</p>
                    <p className="text-gray-400 text-sm">Get notified when new vulnerabilities are discovered</p>
                  </div>
                  <Switch
                    checked={notifications.newVulnerabilities}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newVulnerabilities: checked }))}
                  />
                </div>

                <Separator className="bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-100 font-medium">System Alerts</p>
                    <p className="text-gray-400 text-sm">Receive notifications about system status and maintenance</p>
                  </div>
                  <Switch
                    checked={notifications.systemAlerts}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, systemAlerts: checked }))}
                  />
                </div>

                <Separator className="bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-100 font-medium">Weekly Digest</p>
                    <p className="text-gray-400 text-sm">Weekly summary of your activity and findings</p>
                  </div>
                  <Switch
                    checked={notifications.weeklyDigest}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weeklyDigest: checked }))}
                  />
                </div>

                <Button onClick={handleSaveNotifications} className="bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-100">Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Current Password</label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    className="bg-card border-gray-600 text-gray-100"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300 mb-2 block">New Password</label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    className="bg-card border-gray-600 text-gray-100"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Confirm New Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    className="bg-card border-gray-600 text-gray-100"
                  />
                </div>

                <Button className="bg-primary hover:bg-primary/90">
                  <Key className="h-4 w-4 mr-2" />
                  Update Password
                </Button>

                <Separator className="bg-gray-700" />

                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <h4 className="text-warning font-medium mb-2">Two-Factor Authentication</h4>
                  <p className="text-gray-300 text-sm mb-4">
                    Add an extra layer of security to your account with 2FA.
                  </p>
                  <Button variant="outline" className="border-warning text-warning hover:bg-warning/10">
                    Enable 2FA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Management */}
          <TabsContent value="data" className="space-y-6">
            <Card className="bg-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-100">Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-gray-100 font-medium">Export Data</h4>
                    <p className="text-gray-400 text-sm">
                      Download all your data including programs, vulnerabilities, and reports.
                    </p>
                    <Button onClick={handleExportData} className="bg-primary hover:bg-primary/90 w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export All Data
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-gray-100 font-medium">Import Data</h4>
                    <p className="text-gray-400 text-sm">
                      Import data from a previous export or another platform.
                    </p>
                    <Button onClick={handleImportData} variant="outline" className="border-gray-600 text-gray-300 w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </Button>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                  <h4 className="text-error font-medium mb-2">Danger Zone</h4>
                  <p className="text-gray-300 text-sm mb-4">
                    These actions cannot be undone. Please be careful.
                  </p>
                  <div className="space-y-3">
                    <Button variant="destructive" className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset All Settings
                    </Button>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
