import React, { useEffect, useState } from 'react';
import { db, Horse, Location, LocationAssignment, Owner } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react';
import { UnifiedFilters } from '@/components/UnifiedFilters';
import { useUnifiedFilters, filterFunctions } from '@/hooks/useUnifiedFilters';

interface HorseStatus {
  horse: Horse & { owner?: Owner };
  location?: Location;
  assignment?: LocationAssignment;
  status: 'green' | 'yellow' | 'red' | 'grey';
  statusText: string;
}

export function CommandCenter() {
  const { filters, filterData, updateFilter, clearFilters, getFilteredData } = useUnifiedFilters();
  const [horseStatuses, setHorseStatuses] = useState<HorseStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadCommandData = async () => {
    setIsLoading(true);
    try {
      const horses = await db.horses.toArray();
      const owners = await db.owners.toArray();
      const locations = await db.locations.toArray();
      const assignments = await db.location_assignments.toArray();

      const statuses: HorseStatus[] = horses.map(horse => {
        const owner = owners.find(o => o.id === horse.owner_id);
        const horseWithOwner = { ...horse, owner };
        const assignment = assignments.find(a => a.horse_id === horse.id);
        const location = assignment ? locations.find(l => l.id === assignment.location_id) : undefined;

        let status: 'green' | 'yellow' | 'red' | 'grey' = 'grey';
        let statusText = 'Unknown';

        if (horse.status === 'inactive' || horse.status === 'retired') {
          status = 'grey';
          statusText = horse.status === 'inactive' ? 'Inactive' : 'Retired';
        } else if (horse.status === 'injured') {
          status = 'red';
          statusText = 'Injured - Medical Attention Required';
        } else if (horse.current_activity === 'walking' && !assignment) {
          status = 'yellow';
          statusText = 'Walking - No Location Assigned';
        } else if (assignment && location) {
          status = 'green';
          statusText = `In ${location.name} - ${horse.current_activity || 'Assigned'}`;
        } else if (!assignment) {
          status = 'red';
          statusText = 'No Location Assignment';
        } else {
          status = 'yellow';
          statusText = 'Location Assignment Issue';
        }

        return {
          horse: horseWithOwner,
          location,
          assignment,
          status,
          statusText
        };
      });

      setHorseStatuses(statuses);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading command center data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCommandData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadCommandData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Apply filters to horse statuses
  const filteredHorseStatuses = getFilteredData(horseStatuses, (status, filters, filterData) => 
    filterFunctions.horses(status.horse, filters, filterData)
  );

  const getStatusCounts = () => {
    const counts = {
      green: filteredHorseStatuses.filter(h => h.status === 'green').length,
      yellow: filteredHorseStatuses.filter(h => h.status === 'yellow').length,
      red: filteredHorseStatuses.filter(h => h.status === 'red').length,
      grey: filteredHorseStatuses.filter(h => h.status === 'grey').length,
    };
    return counts;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return <CheckCircle className="h-4 w-4" />;
      case 'yellow': return <Clock className="h-4 w-4" />;
      case 'red': return <AlertTriangle className="h-4 w-4" />;
      case 'grey': return <Eye className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'green': return 'default';
      case 'yellow': return 'secondary';
      case 'red': return 'destructive';
      case 'grey': return 'outline';
      default: return 'outline';
    }
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">
            Real-time NOC-style horse location and status monitoring
          </p>
        </div>
        <Button onClick={loadCommandData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <UnifiedFilters
        filters={filters}
        filterData={filterData}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        enabledFilters={['owner', 'status', 'location', 'searchTerm']}
      />

      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Clear</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.green}</div>
            <p className="text-xs text-muted-foreground">
              Horses in correct locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attention Needed</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{statusCounts.yellow}</div>
            <p className="text-xs text-muted-foreground">
              Minor location issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statusCounts.red}</div>
            <p className="text-xs text-muted-foreground">
              Immediate attention required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Eye className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{statusCounts.grey}</div>
            <p className="text-xs text-muted-foreground">
              Not currently active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Live Horse Status Monitor</CardTitle>
          <CardDescription>
            Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh every 30 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredHorseStatuses.map((horseStatus) => (
                <div
                  key={horseStatus.horse.id}
                  className={`
                    p-3 rounded-lg border-2 transition-colors
                    ${horseStatus.status === 'green' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
                    ${horseStatus.status === 'yellow' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : ''}
                    ${horseStatus.status === 'red' ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''}
                    ${horseStatus.status === 'grey' ? 'border-gray-300 bg-gray-50 dark:bg-gray-950' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">
                      {horseStatus.horse.name}
                    </div>
                    <Badge variant={getStatusVariant(horseStatus.status)} className="text-xs">
                      {getStatusIcon(horseStatus.status)}
                      <span className="ml-1">{horseStatus.status.toUpperCase()}</span>
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    ID: {horseStatus.horse.tracking_id}
                  </div>
                  <div className="text-xs font-medium">
                    {horseStatus.statusText}
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