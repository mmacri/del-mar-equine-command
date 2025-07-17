import React, { useEffect, useState } from 'react';
import { db, Horse, Location, LocationAssignment, Owner } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertTriangle, Clock, Search, Filter } from 'lucide-react';
import { UnifiedFilters } from '@/components/UnifiedFilters';
import { useUnifiedFilters, filterFunctions } from '@/hooks/useUnifiedFilters';

interface ProblemHorse {
  horse: Horse & { owner?: Owner };
  location?: Location;
  assignment?: LocationAssignment;
  problem: 'critical' | 'warning';
  problemText: string;
  details: string;
}

export function ProblemsView() {
  const { filters, filterData, updateFilter, clearFilters, getFilteredData } = useUnifiedFilters();
  const [problemHorses, setProblemHorses] = useState<ProblemHorse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [problemFilter, setProblemFilter] = useState<'all' | 'critical' | 'warning'>('all');

  const loadProblemsData = async () => {
    setIsLoading(true);
    try {
      const horses = await db.horses.toArray();
      const owners = await db.owners.toArray();
      const locations = await db.locations.toArray();
      const assignments = await db.location_assignments.toArray();

      const problems: ProblemHorse[] = [];

      horses.forEach(horse => {
        const owner = owners.find(o => o.id === horse.owner_id);
        const horseWithOwner = { ...horse, owner };
        const assignment = assignments.find(a => a.horse_id === horse.id);
        const location = assignment ? locations.find(l => l.id === assignment.location_id) : undefined;

        // Critical problems (Red status)
        if (horse.status === 'injured') {
          problems.push({
            horse: horseWithOwner,
            location,
            assignment,
            problem: 'critical',
            problemText: 'Horse Injured',
            details: 'Horse requires immediate medical attention and should not be moved without veterinary approval.'
          });
        } else if (!assignment && horse.status === 'active') {
          problems.push({
            horse: horseWithOwner,
            location,
            assignment,
            problem: 'critical',
            problemText: 'No Location Assignment',
            details: 'Active horse has no location assignment. This horse needs to be assigned to a proper location immediately.'
          });
        }

        // Warning problems (Yellow status)
        if (horse.current_activity === 'walking' && !assignment) {
          problems.push({
            horse: horseWithOwner,
            location,
            assignment,
            problem: 'warning',
            problemText: 'Walking Without Location',
            details: 'Horse is walking but has no specific location assigned. Consider assigning to a paddock or track.'
          });
        }

        // Check for location capacity issues
        if (assignment && location) {
          const assignmentsInLocation = assignments.filter(a => a.location_id === location.id);
          if (assignmentsInLocation.length > location.capacity) {
            problems.push({
              horse: horseWithOwner,
              location,
              assignment,
              problem: 'warning',
              problemText: 'Location Over Capacity',
              details: `${location.name} is over capacity (${assignmentsInLocation.length}/${location.capacity}). Consider redistributing horses.`
            });
          }
        }
      });

      setProblemHorses(problems);
    } catch (error) {
      console.error('Error loading problems data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProblemsData();
  }, []);

  // Apply filters
  const baseFilteredProblems = getFilteredData(problemHorses, (problem, filters, filterData) =>
    filterFunctions.horses(problem.horse, filters, filterData)
  );

  // Apply problem type filter
  const filteredHorses = baseFilteredProblems.filter(problem => 
    problemFilter === 'all' || problem.problem === problemFilter
  );

  const criticalCount = problemHorses.filter(p => p.problem === 'critical').length;
  const warningCount = problemHorses.filter(p => p.problem === 'warning').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Problems Dashboard</h1>
          <p className="text-muted-foreground">
            Horses requiring immediate attention or triage
          </p>
        </div>
        <Button onClick={loadProblemsData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Problem Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
            <p className="text-xs text-muted-foreground">
              Need attention soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Problems</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{problemHorses.length}</div>
            <p className="text-xs text-muted-foreground">
              All identified issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <UnifiedFilters
        filters={filters}
        filterData={filterData}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        enabledFilters={['owner', 'status', 'location', 'searchTerm']}
      />
      
      {/* Problem Type Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Problem Type:</label>
            <select 
              value={problemFilter} 
              onChange={(e) => setProblemFilter(e.target.value as 'all' | 'critical' | 'warning')}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">All Problems</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warnings Only</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Problems List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : filteredHorses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {problemHorses.length === 0 ? 'No problems detected! All horses are properly managed.' : 'No problems match your current filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredHorses.map((problem, index) => (
            <Card key={`${problem.horse.id}-${index}`} className={`${
              problem.problem === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <CardTitle className="text-lg">{problem.horse.name}</CardTitle>
                      <CardDescription>ID: {problem.horse.tracking_id}</CardDescription>
                    </div>
                    <Badge variant={problem.problem === 'critical' ? 'destructive' : 'secondary'}>
                      {problem.problem === 'critical' ? (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {problem.problemText}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Problem Details</h4>
                    <p className="text-sm text-muted-foreground">{problem.details}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Horse Information</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Status:</strong> {problem.horse.status}</p>
                      <p><strong>Activity:</strong> {problem.horse.current_activity || 'None'}</p>
                      <p><strong>Location:</strong> {problem.location?.name || 'Unassigned'}</p>
                      {problem.location && (
                        <p><strong>Location Type:</strong> {problem.location.type}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}