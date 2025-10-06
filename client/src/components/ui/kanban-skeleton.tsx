import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function KanbanSkeleton() {
  const columns = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {columns.map((column) => (
        <Card key={column} className="bg-surface border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-100 flex items-center justify-between">
              <span>{column}</span>
              <Skeleton className="h-5 w-8" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-gray-600">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
