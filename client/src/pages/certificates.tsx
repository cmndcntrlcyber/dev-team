import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Upload, Download, Trash2, Edit, Lock, Globe, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ClientCertificate {
  id: number;
  name: string;
  description?: string;
  domain?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CertificateUploadForm {
  name: string;
  description: string;
  domain: string;
  passphrase: string;
  certificateFile: File | null;
  privateKeyFile: File | null;
  caFile: File | null;
}

export default function Certificates() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<ClientCertificate | null>(null);
  const [uploadForm, setUploadForm] = useState<CertificateUploadForm>({
    name: '',
    description: '',
    domain: '',
    passphrase: '',
    certificateFile: null,
    privateKeyFile: null,
    caFile: null,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    domain: '',
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: certificates, isLoading } = useQuery<ClientCertificate[]>({
    queryKey: ['/api/certificates'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: CertificateUploadForm) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('domain', data.domain);
      if (data.passphrase) formData.append('passphrase', data.passphrase);
      if (data.certificateFile) formData.append('certificate', data.certificateFile);
      if (data.privateKeyFile) formData.append('privateKey', data.privateKeyFile);
      if (data.caFile) formData.append('ca', data.caFile);

      const response = await fetch('/api/certificates', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload certificate');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/certificates'] });
      setIsUploadDialogOpen(false);
      setUploadForm({
        name: '',
        description: '',
        domain: '',
        passphrase: '',
        certificateFile: null,
        privateKeyFile: null,
        caFile: null,
      });
      toast({
        title: "Certificate Uploaded",
        description: "Client certificate has been successfully uploaded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ClientCertificate> }) => {
      const response = await apiRequest('PUT', `/api/certificates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/certificates'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Certificate Updated",
        description: "Client certificate has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/certificates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/certificates'] });
      toast({
        title: "Certificate Deleted",
        description: "Client certificate has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (field: keyof CertificateUploadForm, file: File | null) => {
    setUploadForm(prev => ({ ...prev, [field]: file }));
  };

  const handleUpload = () => {
    if (!uploadForm.name || !uploadForm.certificateFile || !uploadForm.privateKeyFile) {
      toast({
        title: "Missing Information",
        description: "Please provide a name, certificate file, and private key file.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(uploadForm);
  };

  const handleEdit = (certificate: ClientCertificate) => {
    setSelectedCertificate(certificate);
    setEditForm({
      name: certificate.name,
      description: certificate.description || '',
      domain: certificate.domain || '',
      isActive: certificate.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = () => {
    if (!selectedCertificate) return;
    updateMutation.mutate({
      id: selectedCertificate.id,
      data: editForm,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this certificate?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownload = (id: number, type: 'certificate' | 'privateKey' | 'ca') => {
    const url = `/api/certificates/${id}/download?type=${type}`;
    window.open(url, '_blank');
  };

  const getCertificateStatus = (certificate: ClientCertificate) => {
    if (!certificate.isActive) return { text: 'Inactive', variant: 'secondary' as const };
    if (certificate.expiresAt) {
      const expiryDate = new Date(certificate.expiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) return { text: 'Expired', variant: 'destructive' as const };
      if (daysUntilExpiry < 30) return { text: 'Expiring Soon', variant: 'destructive' as const };
      if (daysUntilExpiry < 90) return { text: 'Valid', variant: 'default' as const };
    }
    return { text: 'Active', variant: 'default' as const };
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading certificates...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Client Certificates</h1>
          <p className="text-gray-400">Manage client certificates for secure resource access</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Certificate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Client Certificate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Certificate Name</Label>
                  <Input
                    id="name"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Client Certificate"
                  />
                </div>
                <div>
                  <Label htmlFor="domain">Domain/Scope</Label>
                  <Input
                    id="domain"
                    value={uploadForm.domain}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="example.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description of this certificate..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certificate">Certificate File (.pem/.crt)</Label>
                  <Input
                    id="certificate"
                    type="file"
                    accept=".pem,.crt,.cer"
                    onChange={(e) => handleFileChange('certificateFile', e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label htmlFor="privateKey">Private Key File (.key/.pem)</Label>
                  <Input
                    id="privateKey"
                    type="file"
                    accept=".key,.pem"
                    onChange={(e) => handleFileChange('privateKeyFile', e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ca">CA Certificate (Optional)</Label>
                  <Input
                    id="ca"
                    type="file"
                    accept=".pem,.crt,.cer"
                    onChange={(e) => handleFileChange('caFile', e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label htmlFor="passphrase">Private Key Passphrase (Optional)</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    value={uploadForm.passphrase}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, passphrase: e.target.value }))}
                    placeholder="Enter passphrase if required"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Certificate'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {certificates?.map((certificate) => {
          const status = getCertificateStatus(certificate);
          return (
            <Card key={certificate.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <div>
                      <CardTitle className="text-lg text-gray-100">{certificate.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {certificate.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={status.variant}>{status.text}</Badge>
                    <Switch
                      checked={certificate.isActive}
                      onCheckedChange={(checked) => {
                        updateMutation.mutate({
                          id: certificate.id,
                          data: { isActive: checked },
                        });
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Domain:</span>
                    <span className="text-gray-100">{certificate.domain || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Expires:</span>
                    <span className="text-gray-100">
                      {certificate.expiresAt 
                        ? format(new Date(certificate.expiresAt), 'MMM dd, yyyy')
                        : 'Unknown'
                      }
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      Uploaded {format(new Date(certificate.createdAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(certificate.id, 'certificate')}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Cert
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(certificate.id, 'privateKey')}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Key
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(certificate)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(certificate.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {certificates?.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-100 mb-2">No Client Certificates</h3>
            <p className="text-gray-400 text-center mb-4">
              Upload client certificates to access secure resources during penetration testing.
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Certificate
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Certificate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Certificate Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-domain">Domain/Scope</Label>
              <Input
                id="edit-domain"
                value={editForm.domain}
                onChange={(e) => setEditForm(prev => ({ ...prev, domain: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSubmit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Certificate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}