import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tip?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  tip,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <Card className="bg-surface border-gray-700">
      <CardContent className="p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-100 mb-3">{title}</h3>
          <p className="text-gray-400 mb-6 leading-relaxed">{description}</p>
          
          {tip && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-400 flex items-start text-left">
                <span className="font-semibold mr-2">💡 Tip:</span>
                {tip}
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {actionLabel && onAction && (
              <Button 
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={onAction}
                size="lg"
              >
                {actionLabel}
              </Button>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <Button 
                variant="outline"
                className="border-gray-600 text-gray-300"
                onClick={onSecondaryAction}
                size="lg"
              >
                {secondaryActionLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
