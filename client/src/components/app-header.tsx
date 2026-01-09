import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Bell, Info, User, LogOut, Settings } from "lucide-react";
import { Link } from "wouter";

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
}

export default function AppHeader() {
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleMarkAllAsRead = () => {
    setUnreadNotifications(0);
  };

  const handleNotificationClick = (notificationId: number) => {
    console.log('Notification clicked:', notificationId);
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface border-b border-gray-700 px-6 z-40">
      <div className="flex items-center justify-end h-full space-x-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative">
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-card border-gray-600 text-gray-100 hover:bg-gray-700"
              >
                <Bell className="h-4 w-4" />
              </Button>
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-96 bg-surface border-gray-700" align="end">
            <DropdownMenuLabel className="flex items-center justify-between p-4 pb-2">
              <span className="text-lg font-semibold text-gray-100">Notifications</span>
              {unreadNotifications > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary hover:text-primary/80 p-0 h-auto"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No new notifications
                </div>
              ) : (
                notifications.map((notification: any) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="p-4 cursor-pointer hover:bg-card focus:bg-card"
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <Info className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-gray-100">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="rounded-full bg-primary text-white hover:bg-primary/90 border-0"
            >
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-surface border-gray-700" align="end">
            <DropdownMenuLabel className="text-gray-100">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Developer</p>
                <p className="text-xs font-normal text-gray-400">developer@devteam.local</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer text-gray-300 hover:text-gray-100">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem 
              className="cursor-pointer text-error hover:text-error/90"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
