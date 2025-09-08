import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  Folder, 
  File, 
  Upload, 
  Download, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Home,
  RefreshCw 
} from "lucide-react";

interface FileInfo {
  name: string;
  type: "file" | "directory";
  size?: number;
  lastModified?: string;
  path: string;
}

interface DirectoryListing {
  currentPath: string;
  files: FileInfo[];
  parent?: string;
}

export default function FileManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState("/");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Get user home path
  const { data: homeData } = useQuery({
    queryKey: ["/api/files/user-home"],
  });

  // Directory listing
  const { data: listing, isLoading, refetch } = useQuery({
    queryKey: ["/api/files", currentPath],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/files?path=${encodeURIComponent(currentPath)}`);
      return response.json() as Promise<DirectoryListing>;
    },
  });

  // Create directory mutation
  const createDirectory = useMutation({
    mutationFn: async (dirName: string) => {
      const newPath = currentPath === "/" ? `/${dirName}` : `${currentPath}/${dirName}`;
      const response = await apiRequest("POST", "/api/files/directory", { path: newPath });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", currentPath] });
      setNewFolderName("");
      setShowNewFolderDialog(false);
      toast({ title: "Folder created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create folder", description: error.message, variant: "destructive" });
    },
  });

  // Delete file mutation
  const deleteFile = useMutation({
    mutationFn: async (filePath: string) => {
      const response = await apiRequest("DELETE", `/api/files?path=${encodeURIComponent(filePath)}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", currentPath] });
      toast({ title: "File deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete file", description: error.message, variant: "destructive" });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", currentPath);
      
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", currentPath] });
      setUploadFile(null);
      toast({ title: "File uploaded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to upload file", description: error.message, variant: "destructive" });
    },
  });

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleDownload = (filePath: string) => {
    const downloadUrl = `/api/files/download?path=${encodeURIComponent(filePath)}`;
    window.open(downloadUrl, '_blank');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">File Manager</h2>
          <p className="text-gray-400">
            Your personal directory: {homeData?.homePath || `/home/${user?.username || 'user'}`}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="border-gray-600 text-gray-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-surface border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-100">Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="bg-card border-gray-600 text-gray-100"
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={() => createDirectory.mutate(newFolderName)}
                    disabled={!newFolderName.trim() || createDirectory.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewFolderDialog(false)}
                    className="border-gray-600 text-gray-300"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="relative">
            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploadFileMutation.isPending}
            />
            <Button 
              variant="outline" 
              size="sm"
              disabled={uploadFileMutation.isPending}
              className="border-gray-600 text-gray-300"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <Card className="bg-surface border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate("/")}
              className="text-gray-300 hover:text-gray-100"
            >
              <Home className="h-4 w-4" />
            </Button>
            {currentPath !== "/" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate(listing?.parent || "/")}
                className="text-gray-300 hover:text-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="text-gray-400">Current path:</span>
            <span className="font-mono text-gray-100">{currentPath}</span>
          </div>
        </CardContent>
      </Card>

      {/* File listing */}
      <Card className="bg-surface border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Files and Folders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : listing?.files.length === 0 ? (
            <div className="text-center text-gray-400 py-8">This folder is empty</div>
          ) : (
            <div className="space-y-2">
              {listing?.files.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {file.type === "directory" ? (
                      <Folder className="h-5 w-5 text-blue-400" />
                    ) : (
                      <File className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <div className="font-medium text-gray-100">{file.name}</div>
                      <div className="text-xs text-gray-400">
                        {file.type === "file" && file.size && formatFileSize(file.size)}
                        {file.lastModified && ` • ${formatDate(file.lastModified)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.type === "directory" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNavigate(file.path)}
                        className="text-gray-300 hover:text-gray-100"
                      >
                        Open
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file.path)}
                        className="text-gray-300 hover:text-gray-100"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFile.mutate(file.path)}
                      disabled={deleteFile.isPending}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}