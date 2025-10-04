import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendColor?: "success" | "error" | "warning";
  iconColor?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendColor = "success",
  iconColor = "text-primary"
}: StatsCardProps) {
  const trendColorClass = {
    success: "text-success",
    error: "text-error",
    warning: "text-warning"
  }[trendColor];

  return (
    <Card className="bg-surface border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-gray-100 mt-2">{value}</p>
          </div>
          <div className={`bg-${iconColor.replace('text-', '')}/10 p-3 rounded-lg`}>
            <Icon className={`${iconColor} text-xl h-6 w-6`} />
          </div>
        </div>
        {trend && (
          <div className="mt-4">
            <span className={`${trendColorClass} text-sm`}>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
