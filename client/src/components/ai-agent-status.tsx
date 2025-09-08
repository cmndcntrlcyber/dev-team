import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type AiAgent } from "@shared/schema";
import { Bot, Zap, Shield } from "lucide-react";

interface AiAgentStatusProps {
  agent: AiAgent;
  onTest?: (agent: AiAgent) => void;
}

const statusColors = {
  online: "bg-success/10 text-success",
  offline: "bg-error/10 text-error",
  error: "bg-warning/10 text-warning"
};

const statusDots = {
  online: "bg-success",
  offline: "bg-error",
  error: "bg-warning"
};

const agentIcons = {
  openai: Bot,
  local: Bot,
  burp: Shield
};

export default function AiAgentStatus({ agent, onTest }: AiAgentStatusProps) {
  const Icon = agentIcons[agent.type as keyof typeof agentIcons] || Bot;

  const handleTest = () => {
    if (onTest) {
      onTest(agent);
    }
  };

  return (
    <Card className="bg-card border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${statusDots[agent.status as keyof typeof statusDots]}`} />
            <div>
              <p className="font-medium text-gray-100 flex items-center">
                <Icon className="h-4 w-4 mr-2" />
                {agent.name}
              </p>
              <p className="text-sm text-gray-400">
                {agent.type === 'openai' && 'Report generation & analysis'}
                {agent.type === 'local' && 'Code analysis & vulnerability detection'}
                {agent.type === 'burp' && 'Automated testing & scanning'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge 
              variant="secondary" 
              className={`${statusColors[agent.status as keyof typeof statusColors]} mb-1`}
            >
              {agent.status}
            </Badge>
            {agent.lastPing && (
              <p className="text-xs text-gray-400">
                Last ping: {new Date(agent.lastPing).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-3 flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            className="flex-1"
          >
            <Zap className="h-3 w-3 mr-1" />
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
