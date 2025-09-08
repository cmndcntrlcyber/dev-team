import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Program } from "@shared/schema";
import { Building, Globe, DollarSign, Calendar, AlertCircle, Tag } from "lucide-react";
import { format } from "date-fns";

interface ProgramCardProps {
  program: Program;
  onSelect?: (program: Program) => void;
}

const statusColors = {
  active: "bg-success/10 text-success",
  paused: "bg-warning/10 text-warning",
  ended: "bg-error/10 text-error"
};

const priorityColors = {
  low: "bg-gray-500/10 text-gray-400",
  medium: "bg-blue-500/10 text-blue-400",
  high: "bg-orange-500/10 text-orange-400",
  critical: "bg-red-500/10 text-red-400"
};

export default function ProgramCard({ program, onSelect }: ProgramCardProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(program);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getColorFromName = (name: string) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-red-600', 'bg-purple-600', 'bg-yellow-600', 'bg-indigo-600'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Card 
      className="bg-surface border-gray-700 hover:bg-card cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${getColorFromName(program.name)}`}>
              {getInitials(program.name)}
            </div>
            <div>
              <h3 className="font-medium text-gray-100">{program.name}</h3>
              <p className="text-sm text-gray-400 flex items-center">
                <Globe className="h-3 w-3 mr-1" />
                <a 
                  href={program.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {program.name} {program.platform}
                </a>
              </p>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className={`${statusColors[program.status as keyof typeof statusColors]} px-2 py-1 text-xs font-medium`}
          >
            {program.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div className="flex items-center text-gray-400">
            <Building className="h-4 w-4 mr-2" />
            <span>{program.platform}</span>
          </div>
          <div className="flex items-center text-gray-400">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>${program.minReward} - ${program.maxReward}</span>
          </div>
        </div>

        {/* Priority and Tags Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(program as any).priority && (
              <Badge 
                variant="secondary" 
                className={`${priorityColors[(program as any).priority as keyof typeof priorityColors]} px-2 py-0.5 text-xs`}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                {(program as any).priority}
              </Badge>
            )}
            {(program as any).endDate && new Date((program as any).endDate) < new Date() && (
              <Badge variant="secondary" className="bg-gray-500/10 text-gray-400 px-2 py-0.5 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Ended
              </Badge>
            )}
          </div>
          
          {(program as any).tags && (program as any).tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-400">{(program as any).tags.length}</span>
            </div>
          )}
        </div>

        {/* Description if exists */}
        {program.description && (
          <p className="text-xs text-gray-400 mt-3 line-clamp-2">
            {program.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
