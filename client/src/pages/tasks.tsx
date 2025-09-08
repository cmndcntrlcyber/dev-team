import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VulnerabilityCard from "@/components/vulnerability-card";
import VulnerabilityForm from "@/components/vulnerability-form";
import { Plus, Search, Filter, Bug } from "lucide-react";

export default function Vulnerabilities() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: vulnerabilities, isLoading } = useQuery({
    queryKey: ["/api/vulnerabilities"],
  });

  const filteredVulnerabilities = vulnerabilities?.filter((vuln: any) =>
    vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vuln.severity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vuln.status.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Loading vulnerabilities...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Vulnerability Reports</h2>
            <p className="text-gray-400 mt-1">Track and manage your vulnerability discoveries</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-surface border-gray-700 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-gray-100">Create New Vulnerability Report</DialogTitle>
              </DialogHeader>
              <VulnerabilityForm
                onSuccess={() => setShowForm(false)}
                onCancel={() => setShowForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Search and Filter */}
        <Card className="bg-surface border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search vulnerabilities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-card border-gray-600 text-gray-100"
                />
              </div>
              <Button variant="outline" className="border-gray-600 text-gray-300">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vulnerability Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-error mb-1">
                  {vulnerabilities?.filter((v: any) => v.severity === 'P1').length || 0}
                </div>
                <div className="text-sm text-gray-400">Critical</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-warning mb-1">
                  {vulnerabilities?.filter((v: any) => v.severity === 'P2').length || 0}
                </div>
                <div className="text-sm text-gray-400">High</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {vulnerabilities?.filter((v: any) => v.severity === 'P3').length || 0}
                </div>
                <div className="text-sm text-gray-400">Medium</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success mb-1">
                  {vulnerabilities?.filter((v: any) => v.severity === 'P4').length || 0}
                </div>
                <div className="text-sm text-gray-400">Low</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vulnerabilities List */}
        {filteredVulnerabilities.length === 0 ? (
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bug className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-100 mb-2">No Vulnerabilities Found</h3>
                <p className="text-gray-400 mb-6">
                  {searchTerm ? "No vulnerabilities match your search criteria." : "Start by creating your first vulnerability report."}
                </p>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVulnerabilities.map((vulnerability: any) => (
              <VulnerabilityCard key={vulnerability.id} vulnerability={vulnerability} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
