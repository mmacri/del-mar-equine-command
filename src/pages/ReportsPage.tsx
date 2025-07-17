import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Horse, Activity, Race, DrugTest, VeterinaryRecord } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  FileText, 
  BarChart3, 
  Calendar,
  TrendingUp,
  Users,
  Activity as ActivityIcon
} from 'lucide-react';
import { UnifiedFilters } from '@/components/UnifiedFilters';
import { useUnifiedFilters } from '@/hooks/useUnifiedFilters';

interface ReportData {
  totalHorses: number;
  activeHorses: number;
  totalActivities: number;
  totalRaces: number;
  drugTestsCount: number;
  vetRecordsCount: number;
  horsesByStatus: { status: string; count: number }[];
  activitiesByType: { type: string; count: number }[];
  monthlyActivities: { month: string; count: number }[];
}

export function ReportsPage() {
  const { user } = useAuth();
  const { filters, filterData, updateFilter, clearFilters } = useUnifiedFilters();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState('current_season');

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      let horses: Horse[] = [];
      
      if (user?.role === 'admin' || user?.role === 'viewer') {
        horses = await db.horses.toArray();
      } else if (user?.role === 'owner') {
        const owner = await db.owners.where('email').equals(user.email).first();
        if (owner) {
          horses = await db.horses.where('owner_id').equals(owner.id!).toArray();
        }
      }

      const activities = await db.activities.toArray();
      const races = await db.races.toArray();
      const drugTests = await db.drug_tests.toArray();
      const vetRecords = await db.veterinary_records.toArray();

      // Calculate horse statistics by status
      const horsesByStatus = [
        { status: 'Active', count: horses.filter(h => h.status === 'active').length },
        { status: 'Inactive', count: horses.filter(h => h.status === 'inactive').length },
        { status: 'Injured', count: horses.filter(h => h.status === 'injured').length },
        { status: 'Retired', count: horses.filter(h => h.status === 'retired').length },
      ];

      // Calculate activities by type
      const activityTypes = ['training', 'racing', 'walking', 'resting', 'medical', 'transport'];
      const activitiesByType = activityTypes.map(type => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: activities.filter(a => a.activity_type === type).length
      }));

      // Calculate monthly activities (last 6 months)
      const monthlyActivities = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const count = activities.filter(a => {
          const activityDate = new Date(a.start_time);
          return activityDate.getMonth() === date.getMonth() && 
                 activityDate.getFullYear() === date.getFullYear();
        }).length;
        monthlyActivities.push({ month, count });
      }

      setReportData({
        totalHorses: horses.length,
        activeHorses: horses.filter(h => h.status === 'active').length,
        totalActivities: activities.length,
        totalRaces: races.length,
        drugTestsCount: drugTests.length,
        vetRecordsCount: vetRecords.length,
        horsesByStatus,
        activitiesByType,
        monthlyActivities
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [user]);

  const generateReport = () => {
    if (!reportData) return;

    const reportContent = [
      'Del Mar Equine Command Center Report',
      `Generated: ${new Date().toLocaleString()}`,
      `Report Type: ${reportType}`,
      `Date Range: ${dateRange}`,
      '',
      'SUMMARY STATISTICS:',
      `Total Horses: ${reportData.totalHorses}`,
      `Active Horses: ${reportData.activeHorses}`,
      `Total Activities: ${reportData.totalActivities}`,
      `Total Races: ${reportData.totalRaces}`,
      `Drug Tests: ${reportData.drugTestsCount}`,
      `Veterinary Records: ${reportData.vetRecordsCount}`,
      '',
      'HORSES BY STATUS:',
      ...reportData.horsesByStatus.map(item => `${item.status}: ${item.count}`),
      '',
      'ACTIVITIES BY TYPE:',
      ...reportData.activitiesByType.map(item => `${item.type}: ${item.count}`),
      '',
      'MONTHLY ACTIVITY TREND:',
      ...reportData.monthlyActivities.map(item => `${item.month}: ${item.count} activities`)
    ].join('\n');

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equine_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const reportTypes = [
    { value: 'summary', label: 'Summary Report' },
    { value: 'horse_activity', label: 'Horse Activity Report' },
    { value: 'race_performance', label: 'Race Performance Report' },
    { value: 'health_compliance', label: 'Health & Compliance Report' },
    { value: 'owner_summary', label: 'Owner Summary Report' },
    { value: 'seasonal_analysis', label: 'Seasonal Analysis Report' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate comprehensive reports and analyze horse management data
          </p>
        </div>
        <Button onClick={generateReport} disabled={!reportData}>
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      {/* Filters */}
      <UnifiedFilters
        filters={filters}
        filterData={filterData}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        enabledFilters={['owner', 'status', 'race', 'searchTerm']}
      />

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>
            Configure your report parameters and generate custom analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-range">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_season">Current Season</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {user?.role === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="owner-filter">Owner Filter</Label>
                <Select value={filters.owner || 'all'} onValueChange={(value) => updateFilter('owner', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    <SelectItem value="john_smith">John Smith Racing</SelectItem>
                    <SelectItem value="golden_gate">Golden Gate Stables</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {reportData && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Horses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalHorses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reportData.activeHorses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activities</CardTitle>
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalActivities}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Races</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalRaces}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drug Tests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.drugTestsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vet Records</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.vetRecordsCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Previews */}
      {reportData && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Horse Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.horsesByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.status}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ 
                            width: `${reportData.totalHorses > 0 ? (item.count / reportData.totalHorses) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.activitiesByType.map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.type}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-secondary h-2 rounded-full transition-all"
                          style={{ 
                            width: `${reportData.totalActivities > 0 ? (item.count / reportData.totalActivities) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>
            Generate detailed reports for different aspects of horse management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTypes.map((type) => (
              <Card key={type.value} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">{type.label}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.value === 'summary' && 'Comprehensive overview of all horse management activities'}
                      {type.value === 'horse_activity' && 'Detailed activity logs and patterns for individual horses'}
                      {type.value === 'race_performance' && 'Racing statistics and performance analytics'}
                      {type.value === 'health_compliance' && 'Health records and compliance tracking'}
                      {type.value === 'owner_summary' && 'Owner-specific horse portfolios and statistics'}
                      {type.value === 'seasonal_analysis' && 'Seasonal trends and year-over-year comparisons'}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}