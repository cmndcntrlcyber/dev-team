import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { type Program } from "@shared/schema";
import { 
  Globe, 
  Building, 
  DollarSign, 
  Calendar, 
  Mail, 
  User, 
  Tag, 
  Shield, 
  AlertTriangle,
  FileText,
  Edit,
  ExternalLink,
  Clock,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import ProgramFormEnhanced from "./program-form-enhanced";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ProgramDetailProps {
  program: Program | null;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

const statusColors = {
  active: "bg-success/10 text-success border-success/20",
  paused: "bg-warning/10 text-warning border-warning/20",
  ended: "bg-error/10 text-error border-error/20"
};

const priorityColors = {
  low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20"
};

export default function ProgramDetail({ program, open, onClose, onEdit }: ProgramDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  if (!program) return null;

  const handleEditSuccess = () => {
    setIsEditing(false);
    onEdit?.();
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-surface border-gray-700">
          <ProgramFormEnhanced
            program={program}
            onSuccess={handleEditSuccess}
            onCancel={handleEditCancel}
          />
        </DialogContent>
      </Dialog>
    );
  }

  const programData = program as any; // Type assertion for new fields

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-surface border-gray-700">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-100">{program.name}</DialogTitle>
              <DialogDescription className="mt-2 flex items-center gap-4 text-gray-400">
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {program.platform}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <a 
                    href={program.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    View on Platform
                    <ExternalLink className="h-3 w-3 inline ml-1" />
                  </a>
                </span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`${statusColors[program.status as keyof typeof statusColors]} border`}
              >
                {program.status}
              </Badge>
              {programData.priority && (
                <Badge 
                  variant="secondary" 
                  className={`${priorityColors[programData.priority as keyof typeof priorityColors]} border`}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {programData.priority}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="mt-6 h-[calc(90vh-200px)]">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-card">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scope">Scope & Rules</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Description */}
              {program.description && (
                <Card className="bg-card border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-100">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-gray-100 prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300 prose-code:text-primary prose-code:bg-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-surface prose-pre:border prose-pre:border-gray-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {program.description}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rewards */}
              <Card className="bg-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-100">Reward Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Minimum Reward</p>
                      <p className="text-2xl font-bold text-success">${program.minReward}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Maximum Reward</p>
                      <p className="text-2xl font-bold text-success">${program.maxReward}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dates */}
              <Card className="bg-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-100">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Start Date</p>
                      <p className="text-gray-100 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {programData.startDate ? format(new Date(programData.startDate), 'PPP') : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">End Date</p>
                      <p className="text-gray-100 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {programData.endDate ? format(new Date(programData.endDate), 'PPP') : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-4 bg-gray-700" />
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Created</p>
                      <p className="text-gray-100 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(program.createdAt), 'PPP')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                      <p className="text-gray-100 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(program.updatedAt), 'PPP')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              {programData.tags && programData.tags.length > 0 && (
                <Card className="bg-card border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-100">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {programData.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="bg-card">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="scope" className="space-y-6 mt-6">
              {/* Rules */}
              {programData.rules && (
                <Card className="bg-card border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-100">Program Rules & Policies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-gray-100 prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300 prose-code:text-primary prose-code:bg-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-surface prose-pre:border prose-pre:border-gray-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {programData.rules}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vulnerability Types */}
              {programData.vulnerabilityTypes && programData.vulnerabilityTypes.length > 0 && (
                <Card className="bg-card border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-100">Accepted Vulnerability Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {programData.vulnerabilityTypes.map((type: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-gray-100 text-sm">{type}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Out of Scope */}
              {programData.outOfScope && programData.outOfScope.length > 0 && (
                <Card className="bg-card border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-100">Out of Scope</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {programData.outOfScope.map((item: string, index: number) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-error/5 border border-error/20 rounded-lg">
                          <Shield className="h-4 w-4 text-error mt-0.5" />
                          <span className="text-gray-100 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="contact" className="space-y-6 mt-6">
              <Card className="bg-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-100">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {programData.contactName && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Contact Name</p>
                      <p className="text-gray-100 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {programData.contactName}
                      </p>
                    </div>
                  )}
                  {programData.contactEmail && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Contact Email</p>
                      <p className="text-gray-100 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <a 
                          href={`mailto:${programData.contactEmail}`}
                          className="hover:text-primary transition-colors"
                        >
                          {programData.contactEmail}
                        </a>
                      </p>
                    </div>
                  )}
                  {!programData.contactName && !programData.contactEmail && (
                    <p className="text-gray-400 text-sm">No contact information provided</p>
                  )}
                </CardContent>
              </Card>

              {/* Internal Notes */}
              {programData.notes && (
                <Card className="bg-card border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-100">Internal Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-info/5 border border-info/20 rounded-lg p-4">
                      <FileText className="h-4 w-4 text-info mb-2" />
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{programData.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-6 mt-6">
              <Card className="bg-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-100">Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">No activity recorded yet</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Activity tracking will show vulnerabilities submitted and program interactions
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-card"
          >
            Close
          </Button>
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Program
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}