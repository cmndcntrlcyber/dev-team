import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Programs from "@/pages/programs";
import Vulnerabilities from "@/pages/vulnerabilities";
import Analytics from "@/pages/analytics";
import AiAgents from "@/pages/ai-agents";
import KaliEnvironment from "@/pages/kali-environment";
import BurpSuite from "@/pages/burp-suite";
import Integrations from "@/pages/integrations";
import ContainerManagement from "@/pages/container-management";
import FileManager from "@/pages/file-manager";
import Certificates from "@/pages/certificates";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Sidebar from "@/components/sidebar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gray-100">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/programs" component={Programs} />
          <Route path="/vulnerabilities" component={Vulnerabilities} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/ai-agents" component={AiAgents} />
          <Route path="/kali-environment" component={KaliEnvironment} />
          <Route path="/burp" component={BurpSuite} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/containers" component={ContainerManagement} />
          <Route path="/file-manager" component={FileManager} />
          <Route path="/certificates" component={Certificates} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
