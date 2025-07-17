import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { FilterOptions, FilterData } from '@/hooks/useUnifiedFilters';

interface UnifiedFiltersProps {
  filters: FilterOptions;
  filterData: FilterData;
  onFilterChange: (key: keyof FilterOptions, value: string) => void;
  onClearFilters: () => void;
  enabledFilters?: (keyof FilterOptions)[];
  isLoading?: boolean;
}

export function UnifiedFilters({
  filters,
  filterData,
  onFilterChange,
  onClearFilters,
  enabledFilters = ['owner', 'horse', 'status', 'location', 'race', 'searchTerm'],
  isLoading = false
}: UnifiedFiltersProps) {
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'searchTerm' ? value !== 'all' : value !== ''
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Search Term */}
          {enabledFilters.includes('searchTerm') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.searchTerm || ''}
                  onChange={(e) => onFilterChange('searchTerm', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          )}

          {/* Owner Filter */}
          {enabledFilters.includes('owner') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner</label>
              <Select 
                value={filters.owner || 'all'} 
                onValueChange={(value) => onFilterChange('owner', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {filterData.owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id!.toString()}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Horse Filter */}
          {enabledFilters.includes('horse') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Horse</label>
              <Select 
                value={filters.horse || 'all'} 
                onValueChange={(value) => onFilterChange('horse', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select horse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Horses</SelectItem>
                  {filterData.horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id!.toString()}>
                      {horse.name} ({horse.tracking_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Filter */}
          {enabledFilters.includes('status') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => onFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {filterData.statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Location Filter */}
          {enabledFilters.includes('location') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select 
                value={filters.location || 'all'} 
                onValueChange={(value) => onFilterChange('location', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {filterData.locations.map((location) => (
                    <SelectItem key={location.id} value={location.id!.toString()}>
                      {location.name} ({location.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Race Filter */}
          {enabledFilters.includes('race') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Race</label>
              <Select 
                value={filters.race || 'all'} 
                onValueChange={(value) => onFilterChange('race', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select race" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Races</SelectItem>
                  {filterData.races.map((race) => (
                    <SelectItem key={race.id} value={race.id!.toString()}>
                      {race.name} ({new Date(race.race_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Active filters: {Object.entries(filters)
                .filter(([key, value]) => key !== 'searchTerm' ? value !== 'all' : value !== '')
                .map(([key, value]) => {
                  if (key === 'searchTerm') return `Search: "${value}"`;
                  if (key === 'owner') {
                    const owner = filterData.owners.find(o => o.id?.toString() === value);
                    return `Owner: ${owner?.name || value}`;
                  }
                  if (key === 'horse') {
                    const horse = filterData.horses.find(h => h.id?.toString() === value);
                    return `Horse: ${horse?.name || value}`;
                  }
                  if (key === 'location') {
                    const location = filterData.locations.find(l => l.id?.toString() === value);
                    return `Location: ${location?.name || value}`;
                  }
                  if (key === 'race') {
                    const race = filterData.races.find(r => r.id?.toString() === value);
                    return `Race: ${race?.name || value}`;
                  }
                  return `${key}: ${value}`;
                })
                .join(', ')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}