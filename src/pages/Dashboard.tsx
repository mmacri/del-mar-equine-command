import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Horse, Activity, Race, DrugTest, Owner } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  House as HorseIcon, 
  Activity as ActivityIcon, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { UnifiedFilters } from '@/components/UnifiedFilters';
import { useUnifiedFilters, filterFunctions } from '@/hooks/useUnifiedFilters';

export function Dashboard() {
  const { user } = useAuth();
  const { filters, filterData, updateFilter, clearFilters, getFilteredData } = useUnifiedFilters();
  const [allHorses, setAllHorses] = useState<(Horse & { owner?: Owner })[]>([]);
  const [stats, setStats] = useState({
    totalHorses: 0,
    activeHorses: 0,
    inactiveHorses: 0,
    injuredHorses: 0,
    recentActivities: [] as Activity[],
    upcomingRaces: [] as Race[],
    pendingTests: 0,
    passedTests: 0,
    failedTests: 0
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        let horses: Horse[] = [];
        
        if (user?.role === 'admin' || user?.role === 'viewer') {
          horses = await db.horses.toArray();
        } else if (user?.role === 'owner') {
          // Get owner ID for current user
          const owner = await db.owners.where('email').equals(user.email).first();
          if (owner) {
            horses = await db.horses.where('owner_id').equals(owner.id!).toArray();
          }
        }

        // Get owner information for each horse
        const owners = await db.owners.toArray();
        const horsesWithOwners = horses.map(horse => ({
          ...horse,
          owner: owners.find(o => o.id === horse.owner_id)
        }));

        setAllHorses(horsesWithOwners);

        const activities = await db.activities
          .orderBy('created_at')
          .reverse()
          .limit(10)
          .toArray();

        const races = await db.races
          .where('race_date')
          .above(new Date())
          .limit(5)
          .toArray();

        const drugTests = await db.drug_tests.toArray();

        setStats({
          totalHorses: horses.length,
          activeHorses: horses.filter(h => h.status === 'active').length,
          inactiveHorses: horses.filter(h => h.status === 'inactive').length,
          injuredHorses: horses.filter(h => h.status === 'injured').length,
          recentActivities: activities,
          upcomingRaces: races,
          pendingTests: drugTests.filter(t => t.status === 'pending').length,
          passedTests: drugTests.filter(t => t.status === 'passed').length,
          failedTests: drugTests.filter(t => t.status === 'failed').length,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadDashboardData();
  }, [user]);

  // Apply filters to horses for filtered stats
  const filteredHorses = getFilteredData(allHorses, filterFunctions.horses);
  const filteredStats = {
    totalHorses: filteredHorses.length,
    activeHorses: filteredHorses.filter(h => h.status === 'active').length,
    inactiveHorses: filteredHorses.filter(h => h.status === 'inactive').length,
    injuredHorses: filteredHorses.filter(h => h.status === 'injured').length,
  };

  const statusData = [
    { name: 'Active', value: filteredStats.activeHorses, color: '#22c55e' },
    { name: 'Inactive', value: filteredStats.inactiveHorses, color: '#6b7280' },
    { name: 'Injured', value: filteredStats.injuredHorses, color: '#ef4444' },
  ];

  const testData = [
    { name: 'Passed', value: stats.passedTests, color: '#22c55e' },
    { name: 'Pending', value: stats.pendingTests, color: '#f59e0b' },
    { name: 'Failed', value: stats.failedTests, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.username}. Here's what's happening with your horses.
        </p>
      </div>

      {/* Filters */}
      <UnifiedFilters
        filters={filters}
        filterData={filterData}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        enabledFilters={['owner', 'status', 'searchTerm']}
      />

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Horses</CardTitle>
            <HorseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.totalHorses}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Horses</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{filteredStats.activeHorses}</div>
            <p className="text-xs text-muted-foreground">
              Ready for activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Races</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingRaces.length}</div>
            <p className="text-xs text-muted-foreground">
              Next 5 scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tests</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pendingTests}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting results
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Horse Status Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Horse Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                active: { label: "Active", color: "#22c55e" },
                inactive: { label: "Inactive", color: "#6b7280" },
                injured: { label: "Injured", color: "#ef4444" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest horse activities and movements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.activity_type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Horse ID: {activity.horse_id}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(activity.start_time).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Races */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Races</CardTitle>
            <CardDescription>Next scheduled racing events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.upcomingRaces.map((race) => (
                <div key={race.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{race.name}</p>
                    <p className="text-sm text-muted-foreground">{race.track}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Date(race.race_date).toLocaleDateString()}
                    </p>
                    <Badge variant="outline">{race.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Drug Test Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Drug Test Summary</CardTitle>
            <CardDescription>Recent testing results overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                passed: { label: "Passed", color: "#22c55e" },
                pending: { label: "Pending", color: "#f59e0b" },
                failed: { label: "Failed", color: "#ef4444" },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="#8884d8">
                    {testData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}