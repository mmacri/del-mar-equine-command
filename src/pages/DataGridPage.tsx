import React, { useEffect, useState } from 'react';
import { db, Horse, Owner, Location } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Upload, 
  Edit3,
  ArrowUpDown,
  MoreHorizontal 
} from 'lucide-react';
import { UnifiedFilters } from '@/components/UnifiedFilters';
import { useUnifiedFilters, filterFunctions } from '@/hooks/useUnifiedFilters';

interface HorseGridData extends Horse {
  ownerName: string;
  locationName: string;
}

export function DataGridPage() {
  const { filters, filterData, updateFilter, clearFilters, getFilteredData } = useUnifiedFilters();
  const [horses, setHorses] = useState<HorseGridData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHorses, setSelectedHorses] = useState<number[]>([]);
  const [sortField, setSortField] = useState<keyof HorseGridData>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const loadGridData = async () => {
    setIsLoading(true);
    try {
      const horsesData = await db.horses.toArray();
      const owners = await db.owners.toArray();
      const locations = await db.locations.toArray();
      const assignments = await db.location_assignments.toArray();

      const gridData: HorseGridData[] = horsesData.map(horse => {
        const owner = owners.find(o => o.id === horse.owner_id);
        const assignment = assignments.find(a => a.horse_id === horse.id);
        const location = assignment ? locations.find(l => l.id === assignment.location_id) : undefined;

        return {
          ...horse,
          ownerName: owner?.name || 'Unknown',
          locationName: location?.name || 'Unassigned'
        };
      });

      setHorses(gridData);
    } catch (error) {
      console.error('Error loading grid data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGridData();
  }, []);

  // Apply filters and sorting
  const baseFilteredHorses = getFilteredData(horses, (horse, filters, filterData) => 
    filterFunctions.horses(horse, filters, filterData)
  );

  const filteredHorses = baseFilteredHorses.sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof HorseGridData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectHorse = (horseId: number) => {
    setSelectedHorses(prev => 
      prev.includes(horseId) 
        ? prev.filter(id => id !== horseId)
        : [...prev, horseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedHorses.length === filteredHorses.length) {
      setSelectedHorses([]);
    } else {
      setSelectedHorses(filteredHorses.map(h => h.id!));
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Tracking ID', 'Status', 'Breed', 'Age', 'Gender', 'Owner', 'Location'].join(','),
      ...filteredHorses.map(horse => [
        horse.name,
        horse.tracking_id,
        horse.status,
        horse.breed || '',
        horse.age || '',
        horse.gender,
        horse.ownerName,
        horse.locationName
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horses_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'injured': return 'destructive';
      case 'retired': return 'outline';
      default: return 'outline';
    }
  };

  const SortableHeader = ({ field, children }: { field: keyof HorseGridData; children: React.ReactNode }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Grid</h1>
          <p className="text-muted-foreground">
            Excel-like interface for bulk horse data management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Management</CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedHorses.length > 0 && `${selectedHorses.length} horses selected`}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UnifiedFilters
            filters={filters}
            filterData={filterData}
            onFilterChange={updateFilter}
            onClearFilters={clearFilters}
            enabledFilters={['owner', 'status', 'location', 'searchTerm']}
          />
          <div className="flex gap-4 items-center mt-4">
            {selectedHorses.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit3 className="h-3 w-3 mr-1" />
                  Bulk Edit
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  Export Selected
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left w-8">
                      <Checkbox 
                        checked={selectedHorses.length === filteredHorses.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <SortableHeader field="name">Name</SortableHeader>
                    <SortableHeader field="tracking_id">Tracking ID</SortableHeader>
                    <SortableHeader field="status">Status</SortableHeader>
                    <SortableHeader field="breed">Breed</SortableHeader>
                    <SortableHeader field="age">Age</SortableHeader>
                    <SortableHeader field="gender">Gender</SortableHeader>
                    <SortableHeader field="color">Color</SortableHeader>
                    <SortableHeader field="ownerName">Owner</SortableHeader>
                    <SortableHeader field="locationName">Location</SortableHeader>
                    <SortableHeader field="current_activity">Activity</SortableHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-8">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHorses.map((horse) => (
                    <tr key={horse.id} className="hover:bg-muted/25">
                      <td className="px-4 py-3">
                        <Checkbox 
                          checked={selectedHorses.includes(horse.id!)}
                          onCheckedChange={() => handleSelectHorse(horse.id!)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{horse.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{horse.tracking_id}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(horse.status)}>
                          {horse.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{horse.breed || '-'}</td>
                      <td className="px-4 py-3 text-sm">{horse.age || '-'}</td>
                      <td className="px-4 py-3 text-sm">{horse.gender}</td>
                      <td className="px-4 py-3 text-sm">{horse.color || '-'}</td>
                      <td className="px-4 py-3 text-sm">{horse.ownerName}</td>
                      <td className="px-4 py-3 text-sm">{horse.locationName}</td>
                      <td className="px-4 py-3 text-sm">{horse.current_activity || '-'}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredHorses.length} of {horses.length} horses
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}