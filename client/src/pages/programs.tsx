import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ProgramCard from "@/components/program-card";
import ProgramFormEnhanced from "@/components/program-form-enhanced";
import ProgramDetail from "@/components/program-detail";
import { Plus, Search, Filter } from "lucide-react";
import { type Program } from "@shared/schema";

export default function Programs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  const { data: programs, isLoading, refetch } = useQuery({
    queryKey: ["/api/programs"],
  });

  const filteredPrograms = programs?.filter((program: any) =>
    program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.platform.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Loading programs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Programs & Targets</h2>
            <p className="text-gray-400 mt-1">Manage your bug bounty programs and targets</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-surface border-gray-700">
              <ProgramFormEnhanced
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
                  placeholder="Search programs..."
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

        {/* Programs Grid */}
        {filteredPrograms.length === 0 ? (
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-100 mb-2">No Programs Found</h3>
                <p className="text-gray-400 mb-6">
                  {searchTerm ? "No programs match your search criteria." : "Get started by adding your first bug bounty program."}
                </p>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Program
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program: any) => (
              <ProgramCard 
                key={program.id} 
                program={program} 
                onSelect={(p) => setSelectedProgram(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Program Detail Modal */}
      <ProgramDetail
        program={selectedProgram}
        open={!!selectedProgram}
        onClose={() => setSelectedProgram(null)}
        onEdit={() => {
          refetch();
          setSelectedProgram(null);
        }}
      />
    </div>
  );
}
