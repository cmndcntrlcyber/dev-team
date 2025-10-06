import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Tasks from "@/pages/tasks";
import Analytics from "@/pages/analytics";
import DevAgents from "@/pages/dev-agents";
import Integrations from "@/pages/integrations";
import FileManager from "@/pages/file-manager";
import Certificates from "@/pages/certificates";
import Settings from "@/pages/settings";
import Repositories from "@/pages/repositories";
import Deployments from "@/pages/deployments";
import Releases from "@/pages/releases";
import Login from "@/pages/login";
import Sidebar from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";

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
          <Route path="/projects" component={Projects} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/repositories" component={Repositories} />
          <Route path="/deployments" component={Deployments} />
          <Route path="/releases" component={Releases} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/agents" component={DevAgents} />
          <Route path="/integrations" component={Integrations} />
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
