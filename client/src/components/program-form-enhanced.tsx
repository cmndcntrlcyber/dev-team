import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { insertProgramSchema, type Operation, type Program } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, ChevronRight, Check, X, Plus, Target, Shield, AlertTriangle, FileText, Mail, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Enhanced form schema with all new fields
const formSchema = insertProgramSchema.extend({
  platform: z.string().optional(),
  url: z.string().optional(),
  rules: z.string().optional(),
  outOfScope: z.array(z.string()).optional(),
  minReward: z.string().optional(),
  maxReward: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProgramFormEnhancedProps {
  program?: Program;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const steps = [
  { id: "basic", title: "Basic Info", icon: FileText },
  { id: "rewards", title: "Rewards", icon: Target },
  { id: "scope", title: "Scope", icon: Shield },
  { id: "contact", title: "Contact", icon: Mail },
  { id: "review", title: "Review", icon: Check },
];

const defaultVulnerabilityTypes = [
  "Cross-Site Scripting (XSS)",
  "SQL Injection",
  "Cross-Site Request Forgery (CSRF)",
  "Server-Side Request Forgery (SSRF)",
  "Remote Code Execution (RCE)",
  "Authentication Bypass",
  "Authorization Issues",
  "Information Disclosure",
  "Business Logic Errors",
  "Denial of Service (DoS)",
];

const platformOptions = [
  { value: "HackerOne", label: "HackerOne", color: "bg-purple-500" },
  { value: "Bugcrowd", label: "Bugcrowd", color: "bg-orange-500" },
  { value: "Intigriti", label: "Intigriti", color: "bg-blue-500" },
  { value: "YesWeHack", label: "YesWeHack", color: "bg-green-500" },
  { value: "Synack", label: "Synack", color: "bg-red-500" },
  { value: "Other", label: "Other", color: "bg-gray-500" },
];

export default function ProgramFormEnhanced({ program, onSuccess, onCancel }: ProgramFormEnhancedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const [outOfScopeInput, setOutOfScopeInput] = useState("");
  
  const isEditing = !!program;
  const programData = program as any;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: program?.name || "",
      platform: program?.platform || "",
      url: program?.url || "",
      status: program?.status || "active",
      minReward: program?.minReward?.toString() || "0",
      maxReward: program?.maxReward?.toString() || "0",
      description: program?.description || "",
      priority: programData?.priority || "medium",
      tags: programData?.tags || [],
      rules: programData?.rules || "",
      outOfScope: programData?.outOfScope || [],
      vulnerabilityTypes: programData?.vulnerabilityTypes || [],
      contactEmail: programData?.contactEmail || "",
      contactName: programData?.contactName || "",
      notes: programData?.notes || "",
      startDate: programData?.startDate ? new Date(programData.startDate) : undefined,
      endDate: programData?.endDate ? new Date(programData.endDate) : undefined,
    }
  });

  const createProgram = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing) {
        const response = await apiRequest("PUT", `/api/programs/${program.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/programs", data);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({
        title: "Success",
        description: isEditing ? "Program updated successfully" : "Program created successfully",
      });
      if (!isEditing) {
        form.reset();
      }
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: isEditing ? "Failed to update program" : "Failed to create program",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: FormData) => {
    createProgram.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues("tags") || [];
      form.setValue("tags", [...currentTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (index: number) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter((_, i) => i !== index));
  };

  const addOutOfScope = () => {
    if (outOfScopeInput.trim()) {
      const currentItems = form.getValues("outOfScope") || [];
      form.setValue("outOfScope", [...currentItems, outOfScopeInput.trim()]);
      setOutOfScopeInput("");
    }
  };

  const removeOutOfScope = (index: number) => {
    const currentItems = form.getValues("outOfScope") || [];
    form.setValue("outOfScope", currentItems.filter((_, i) => i !== index));
  };

  const toggleVulnerabilityType = (type: string) => {
    const currentTypes = form.getValues("vulnerabilityTypes") || [];
    if (currentTypes.includes(type)) {
      form.setValue("vulnerabilityTypes", currentTypes.filter(t => t !== type));
    } else {
      form.setValue("vulnerabilityTypes", [...currentTypes, type]);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Card className="bg-surface border-gray-700">
      <CardHeader>
        <CardTitle className="text-2xl text-gray-100">
          {isEditing ? "Edit Security Program" : "Create New Security Program"}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {isEditing ? "Update the program details" : "Fill in the details to add a new program to your portfolio"}
        </CardDescription>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center",
                  index <= currentStep ? "text-primary" : "text-gray-500"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2",
                  index <= currentStep 
                    ? "bg-primary border-primary text-background" 
                    : "bg-card border-gray-600"
                )}>
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs mt-2">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Program Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Acme Corp Bug Bounty"
                            className="bg-card border-gray-600 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Platform *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {platformOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-3 h-3 rounded-full", option.color)} />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Program URL *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://hackerone.com/acmecorp"
                          className="bg-card border-gray-600 text-gray-100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-success rounded-full" />
                                Active
                              </div>
                            </SelectItem>
                            <SelectItem value="paused">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-warning rounded-full" />
                                Paused
                              </div>
                            </SelectItem>
                            <SelectItem value="ended">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-error rounded-full" />
                                Ended
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-card border-gray-600 text-gray-100">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low Priority</SelectItem>
                            <SelectItem value="medium">Medium Priority</SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                            <SelectItem value="critical">Critical Priority</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe the program, its assets, and any special requirements..."
                          className="bg-card border-gray-600 text-gray-100 min-h-[120px]"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-500">
                        You can use Markdown formatting (e.g., **bold**, *italic*, `code`, lists)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel className="text-gray-300">Tags</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Add a tag..."
                        className="bg-card border-gray-600 text-gray-100"
                      />
                      <Button type="button" onClick={addTag} size="sm" className="bg-primary hover:bg-primary/90">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(form.watch("tags") || []).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-card">
                          {tag}
                          <X
                            className="h-3 w-3 ml-1 cursor-pointer"
                            onClick={() => removeTag(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </FormItem>
              </div>
            )}

            {/* Step 2: Rewards & Dates */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Minimum Reward ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            placeholder="0"
                            className="bg-card border-gray-600 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Maximum Reward ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            placeholder="10000"
                            className="bg-card border-gray-600 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-gray-300">Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal bg-card border-gray-600",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-gray-300">End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal bg-card border-gray-600",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-info mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-100">Reward Guidelines</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Set realistic reward ranges based on the program's official bounty table. 
                        Higher rewards typically correlate with more critical vulnerabilities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Scope & Rules */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="rules"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Program Rules & Policies</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter the program's rules, testing guidelines, and policies..."
                          className="bg-card border-gray-600 text-gray-100 min-h-[150px]"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400">
                        Include testing guidelines, responsible disclosure policy, and any special requirements. 
                        Supports Markdown formatting (e.g., **bold**, *italic*, `code`, lists).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel className="text-gray-300">Out of Scope Items</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={outOfScopeInput}
                        onChange={(e) => setOutOfScopeInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOutOfScope())}
                        placeholder="Add out of scope item..."
                        className="bg-card border-gray-600 text-gray-100"
                      />
                      <Button type="button" onClick={addOutOfScope} size="sm" className="bg-primary hover:bg-primary/90">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(form.watch("outOfScope") || []).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 bg-card p-2 rounded">
                          <Shield className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-100 flex-1">{item}</span>
                          <X
                            className="h-4 w-4 text-gray-400 cursor-pointer hover:text-error"
                            onClick={() => removeOutOfScope(index)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </FormItem>

                <FormItem>
                  <FormLabel className="text-gray-300">Accepted Vulnerability Types</FormLabel>
                  <FormDescription className="text-gray-400 mb-3">
                    Select the types of vulnerabilities that are in scope for this program.
                  </FormDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {defaultVulnerabilityTypes.map(type => (
                      <div
                        key={type}
                        onClick={() => toggleVulnerabilityType(type)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                          (form.watch("vulnerabilityTypes") || []).includes(type)
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-card border-gray-600 text-gray-300 hover:border-gray-500"
                        )}
                      >
                        {(form.watch("vulnerabilityTypes") || []).includes(type) ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <div className="w-4 h-4 border border-gray-600 rounded" />
                        )}
                        <span className="text-sm">{type}</span>
                      </div>
                    ))}
                  </div>
                </FormItem>
              </div>
            )}

            {/* Step 4: Contact Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Contact Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Security Team"
                            className="bg-card border-gray-600 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Contact Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="security@example.com"
                            className="bg-card border-gray-600 text-gray-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add any internal notes about this program..."
                          className="bg-card border-gray-600 text-gray-100 min-h-[120px]"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400">
                        These notes are for your reference only and won't be shared.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-card p-6 rounded-lg space-y-4">
                  <h3 className="text-lg font-semibold text-gray-100">Review Program Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Program Name</p>
                      <p className="text-gray-100 font-medium">{form.watch("name") || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Platform</p>
                      <p className="text-gray-100 font-medium">{form.watch("platform") || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <Badge variant={form.watch("status") === "active" ? "default" : "secondary"}>
                        {form.watch("status")}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Priority</p>
                      <Badge variant="outline">{form.watch("priority")}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Reward Range</p>
                      <p className="text-gray-100 font-medium">
                        ${form.watch("minReward")} - ${form.watch("maxReward")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Contact</p>
                      <p className="text-gray-100 font-medium">
                        {form.watch("contactEmail") || "Not specified"}
                      </p>
                    </div>
                  </div>

                  {form.watch("tags")?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {form.watch("tags").map((tag, index) => (
                          <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.watch("vulnerabilityTypes")?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Accepted Vulnerability Types</p>
                      <p className="text-gray-100 text-sm">
                        {form.watch("vulnerabilityTypes").length} types selected
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-100">Ready to Create</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Please review all details before creating the program. You can edit these details later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-700">
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="border-gray-600 text-gray-300 hover:bg-card"
                  >
                    Previous
                  </Button>
                )}
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="border-gray-600 text-gray-300 hover:bg-card"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createProgram.isPending}
                    className="bg-success hover:bg-success/90"
                  >
                    {createProgram.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        {isEditing ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {isEditing ? "Update Program" : "Create Program"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
