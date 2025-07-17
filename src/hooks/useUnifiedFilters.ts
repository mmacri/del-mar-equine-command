import { useState, useEffect, useMemo } from 'react';
import { db, Horse, Owner, Location, Race } from '@/lib/database';

export interface FilterOptions {
  owner?: string;
  horse?: string;
  status?: string;
  location?: string;
  race?: string;
  searchTerm?: string;
}

export interface FilterData {
  owners: Owner[];
  horses: Horse[];
  locations: Location[];
  races: Race[];
  statuses: string[];
}

export function useUnifiedFilters() {
  const [filterData, setFilterData] = useState<FilterData>({
    owners: [],
    horses: [],
    locations: [],
    races: [],
    statuses: ['active', 'inactive', 'injured', 'retired']
  });
  
  const [filters, setFilters] = useState<FilterOptions>({
    owner: 'all',
    horse: 'all',
    status: 'all',
    location: 'all',
    race: 'all',
    searchTerm: ''
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFilterData = async () => {
      setIsLoading(true);
      try {
        const [owners, horses, locations, races] = await Promise.all([
          db.owners.toArray(),
          db.horses.toArray(),
          db.locations.toArray(),
          db.races.toArray()
        ]);

        setFilterData({
          owners,
          horses,
          locations,
          races,
          statuses: ['active', 'inactive', 'injured', 'retired']
        });
      } catch (error) {
        console.error('Error loading filter data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFilterData();
  }, []);

  const updateFilter = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      owner: 'all',
      horse: 'all',
      status: 'all',
      location: 'all',
      race: 'all',
      searchTerm: ''
    });
  };

  const getFilteredData = useMemo(() => {
    return <T extends any[]>(data: T, filterFn: (item: T[0], filters: FilterOptions, filterData: FilterData) => boolean): T => {
      return data.filter(item => filterFn(item, filters, filterData)) as T;
    };
  }, [filters, filterData]);

  return {
    filters,
    filterData,
    isLoading,
    updateFilter,
    clearFilters,
    getFilteredData
  };
}

// Common filter functions for different data types
export const filterFunctions = {
  horses: (horse: Horse & { owner?: Owner; location?: Location }, filters: FilterOptions, filterData: FilterData) => {
    // Owner filter
    if (filters.owner !== 'all' && horse.owner_id !== parseInt(filters.owner)) {
      return false;
    }

    // Status filter
    if (filters.status !== 'all' && horse.status !== filters.status) {
      return false;
    }

    // Search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const searchFields = [
        horse.name,
        horse.tracking_id,
        horse.registration_number,
        horse.breed,
        horse.color,
        horse.owner?.name
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchFields.includes(searchLower)) {
        return false;
      }
    }

    return true;
  },

  races: (race: Race, filters: FilterOptions) => {
    // Status filter
    if (filters.status !== 'all' && race.status !== filters.status) {
      return false;
    }

    // Search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const searchFields = [
        race.name,
        race.track,
        race.race_type
      ].join(' ').toLowerCase();
      
      if (!searchFields.includes(searchLower)) {
        return false;
      }
    }

    return true;
  },

  owners: (owner: Owner, filters: FilterOptions) => {
    // Search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const searchFields = [
        owner.name,
        owner.email,
        owner.phone,
        owner.address
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchFields.includes(searchLower)) {
        return false;
      }
    }

    return true;
  }
};