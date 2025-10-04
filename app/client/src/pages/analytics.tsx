import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, DollarSign, Clock, Download } from "lucide-react";

export default function Analytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: vulnerabilities } = useQuery({
    queryKey: ["/api/vulnerabilities"],
  });

  const { data: programs } = useQuery({
    queryKey: ["/api/programs"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  // Calculate additional metrics
  const totalRewards = vulnerabilities?.reduce((sum: number, vuln: any) => {
    return sum + (vuln.reward ? parseFloat(vuln.reward) : 0);
  }, 0) || 0;

  const resolvedVulns = vulnerabilities?.filter((v: any) => v.status === 'resolved').length || 0;
  const pendingVulns = vulnerabilities?.filter((v: any) => v.status === 'new').length || 0;
  const triagedVulns = vulnerabilities?.filter((v: any) => v.status === 'triaged').length || 0;

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Analytics</h2>
            <p className="text-gray-400 mt-1">Detailed insights and performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select defaultValue="30">
              <SelectTrigger className="bg-card border-gray-600 text-gray-100 w-40">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-gray-600 text-gray-300">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-100 mt-2">
                    ${totalRewards.toLocaleString()}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-lg">
                  <DollarSign className="text-success h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-success text-sm">+12% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-100 mt-2">
                    {vulnerabilities?.length ? Math.round((resolvedVulns / vulnerabilities.length) * 100) : 0}%
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <TrendingUp className="text-primary h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-success text-sm">+5% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg. Payout</p>
                  <p className="text-2xl font-bold text-gray-100 mt-2">
                    ${resolvedVulns ? Math.round(totalRewards / resolvedVulns) : 0}
                  </p>
                </div>
                <div className="bg-warning/10 p-3 rounded-lg">
                  <BarChart3 className="text-warning h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-success text-sm">+8% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg. Time to Resolution</p>
                  <p className="text-2xl font-bold text-gray-100 mt-2">
                    {stats?.avgResponseTime || 0} days
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <Clock className="text-secondary h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-success text-sm">-2 days improvement</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Vulnerability Status Distribution */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100">
                Vulnerability Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-success rounded mr-3" />
                    <span className="text-gray-300">Resolved</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 h-2 bg-gray-700 rounded-full mr-3">
                      <div 
                        className="h-2 bg-success rounded-full"
                        style={{ width: `${vulnerabilities?.length ? (resolvedVulns / vulnerabilities.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-gray-300 text-sm w-12">{resolvedVulns}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-warning rounded mr-3" />
                    <span className="text-gray-300">Triaged</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 h-2 bg-gray-700 rounded-full mr-3">
                      <div 
                        className="h-2 bg-warning rounded-full"
                        style={{ width: `${vulnerabilities?.length ? (triagedVulns / vulnerabilities.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-gray-300 text-sm w-12">{triagedVulns}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-primary rounded mr-3" />
                    <span className="text-gray-300">New</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 h-2 bg-gray-700 rounded-full mr-3">
                      <div 
                        className="h-2 bg-primary rounded-full"
                        style={{ width: `${vulnerabilities?.length ? (pendingVulns / vulnerabilities.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-gray-300 text-sm w-12">{pendingVulns}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card className="bg-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-100">
                Severity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.vulnerabilityTrends?.map((trend: any) => (
                  <div key={trend.severity} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded mr-3 ${
                        trend.severity === 'P1' ? 'bg-error' :
                        trend.severity === 'P2' ? 'bg-warning' :
                        trend.severity === 'P3' ? 'bg-primary' : 'bg-success'
                      }`} />
                      <span className="text-gray-300">
                        {trend.severity === 'P1' && 'Critical'}
                        {trend.severity === 'P2' && 'High'}
                        {trend.severity === 'P3' && 'Medium'}
                        {trend.severity === 'P4' && 'Low'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-32 h-2 bg-gray-700 rounded-full mr-3">
                        <div 
                          className={`h-2 rounded-full ${
                            trend.severity === 'P1' ? 'bg-error' :
                            trend.severity === 'P2' ? 'bg-warning' :
                            trend.severity === 'P3' ? 'bg-primary' : 'bg-success'
                          }`}
                          style={{ width: `${Math.min(100, (trend.count / Math.max(...(stats?.vulnerabilityTrends?.map((t: any) => t.count) || [1]))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-300 text-sm w-12">{trend.count}</span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Program Performance */}
        <Card className="bg-surface border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-100">
              Program Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 font-medium pb-3">Program</th>
                    <th className="text-left text-gray-400 font-medium pb-3">Vulnerabilities</th>
                    <th className="text-left text-gray-400 font-medium pb-3">Rewards</th>
                    <th className="text-left text-gray-400 font-medium pb-3">Success Rate</th>
                    <th className="text-left text-gray-400 font-medium pb-3">Avg. Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {programs?.map((program: any) => {
                    const programVulns = vulnerabilities?.filter((v: any) => v.programId === program.id) || [];
                    const programRewards = programVulns.reduce((sum: number, v: any) => sum + (parseFloat(v.reward) || 0), 0);
                    const resolvedCount = programVulns.filter((v: any) => v.status === 'resolved').length;
                    const successRate = programVulns.length > 0 ? Math.round((resolvedCount / programVulns.length) * 100) : 0;
                    const avgPayout = resolvedCount > 0 ? Math.round(programRewards / resolvedCount) : 0;

                    return (
                      <tr key={program.id} className="border-b border-gray-700 hover:bg-card">
                        <td className="py-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium mr-3">
                              {program.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-100">{program.name}</p>
                              <p className="text-sm text-gray-400">{program.platform}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-gray-300">{programVulns.length}</td>
                        <td className="py-3 text-gray-300">${programRewards.toLocaleString()}</td>
                        <td className="py-3 text-gray-300">{successRate}%</td>
                        <td className="py-3 text-gray-300">${avgPayout.toLocaleString()}</td>
                      </tr>
                    );
                  }) || (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No programs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
