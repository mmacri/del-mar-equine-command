import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Horse, Owner } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye, Edit } from 'lucide-react';
import { UnifiedFilters } from '@/components/UnifiedFilters';
import { useUnifiedFilters, filterFunctions } from '@/hooks/useUnifiedFilters';

export function HorsesPage() {
  const { user } = useAuth();
  const { filters, filterData, updateFilter, clearFilters, getFilteredData } = useUnifiedFilters();
  const [horses, setHorses] = useState<(Horse & { owner?: Owner })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHorses = async () => {
    setIsLoading(true);
    try {
      let horsesData: Horse[] = [];
      
      if (user?.role === 'admin' || user?.role === 'viewer') {
        horsesData = await db.horses.toArray();
      } else if (user?.role === 'owner') {
        // Get owner ID for current user
        const owner = await db.owners.where('email').equals(user.email).first();
        if (owner) {
          horsesData = await db.horses.where('owner_id').equals(owner.id!).toArray();
        }
      }

      // Get owner information for each horse
      const owners = await db.owners.toArray();
      const horsesWithOwners = horsesData.map(horse => ({
        ...horse,
        owner: owners.find(o => o.id === horse.owner_id)
      }));

      setHorses(horsesWithOwners);
    } catch (error) {
      console.error('Error loading horses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHorses();
  }, [user]);

  // Apply filters
  const filteredHorses = getFilteredData(horses, filterFunctions.horses);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'injured': return 'destructive';
      case 'retired': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Horses</h1>
          <p className="text-muted-foreground">
            Manage and view horse records and information
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'owner') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Horse
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Horses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{horses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {horses.filter(h => h.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {horses.filter(h => h.status === 'inactive').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Injured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {horses.filter(h => h.status === 'injured').length}
            </div>
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

      {/* Horses Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : filteredHorses.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {horses.length === 0 ? 'No horses found.' : 'No horses match your current filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredHorses.map((horse) => (
            <Card key={horse.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{horse.name}</CardTitle>
                    <CardDescription>ID: {horse.tracking_id}</CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(horse.status)}>
                    {horse.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {horse.registration_number && (
                    <p><strong>Registration:</strong> {horse.registration_number}</p>
                  )}
                  {horse.breed && (
                    <p><strong>Breed:</strong> {horse.breed}</p>
                  )}
                  {horse.age && (
                    <p><strong>Age:</strong> {horse.age} years</p>
                  )}
                  <p><strong>Gender:</strong> {horse.gender}</p>
                  {horse.color && (
                    <p><strong>Color:</strong> {horse.color}</p>
                  )}
                  <p><strong>Owner:</strong> {horse.owner?.name || 'Unknown'}</p>
                  {horse.current_activity && (
                    <p><strong>Current Activity:</strong> {horse.current_activity}</p>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {(user?.role === 'admin' || user?.role === 'owner') && (
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}