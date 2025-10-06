import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  BarChart3, 
  CheckSquare, 
  Briefcase, 
  Bot, 
  Settings, 
  Gauge,
  Grid3X3,
  FolderOpen,
  LogOut,
  FileKey,
  GitBranch,
  Rocket,
  Package
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Gauge },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Repositories", href: "/repositories", icon: GitBranch },
  { name: "Deployments", href: "/deployments", icon: Rocket },
  { name: "Releases", href: "/releases", icon: Package },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const integrations = [
  { name: "Dev Agents", href: "/agents", icon: Bot },
  { name: "Team Members", href: "/team", icon: Users },
  { name: "All Integrations", href: "/integrations", icon: Grid3X3 },
];

const settings = [
  { name: "File Manager", href: "/file-manager", icon: FolderOpen },
  { name: "Configuration", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-gray-700 z-50">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-500">Dev Team</h1>
        <p className="text-xs text-gray-400 mt-1">AI-Powered Development Platform</p>
      </div>
      
      <nav className="mt-6">
        <div className="px-6 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
          Main
        </div>
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-6 py-3 text-gray-300 hover:bg-card hover:text-gray-100 transition-colors",
                isActive && "bg-primary/10 text-gray-100 border-r-2 border-primary"
              )}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
        
        <div className="px-6 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider mt-6">
          Integrations
        </div>
        {integrations.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-6 py-3 text-gray-300 hover:bg-card hover:text-gray-100 transition-colors",
                isActive && "bg-primary/10 text-gray-100 border-r-2 border-primary"
              )}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
        
        <div className="px-6 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider mt-6">
          Settings
        </div>
        {settings.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-6 py-3 text-gray-300 hover:bg-card hover:text-gray-100 transition-colors",
                isActive && "bg-primary/10 text-gray-100 border-r-2 border-primary"
              )}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
