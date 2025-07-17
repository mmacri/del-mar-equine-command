import React, { useEffect, useState } from 'react';
import { db, Horse, Location, LocationAssignment, Owner } from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Home, Activity, Car } from 'lucide-react';

interface HorseLocation extends Horse {
  owner?: Owner;
  location?: Location;
  currentAssignment?: LocationAssignment;
  stallNumber?: string;
  locationStatus: 'stalled' | 'walking' | 'racing' | 'training' | 'medical' | 'transport';
}

interface LocationMapProps {
  filterByOwner?: number;
  filterByLocation?: number;
  filterByStatus?: string;
}

export function LocationMap({ filterByOwner, filterByLocation, filterByStatus }: LocationMapProps) {
  const [horsesWithLocations, setHorsesWithLocations] = useState<HorseLocation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [filteredHorses, setFilteredHorses] = useState<HorseLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>(filterByOwner?.toString() || 'all');
  const [locationFilter, setLocationFilter] = useState<string>(filterByLocation?.toString() || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(filterByStatus || 'all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [horsesData, locationsData, ownersData, assignments] = await Promise.all([
        db.horses.toArray(),
        db.locations.toArray(),
        db.owners.toArray(),
        db.location_assignments.toArray()
      ]);

      // Create enhanced horse data with location info
      const enhancedHorses: HorseLocation[] = horsesData.map(horse => {
        const owner = ownersData.find(o => o.id === horse.owner_id);
        const currentAssignment = assignments
          .filter(a => a.horse_id === horse.id && (!a.assigned_until || a.assigned_until > new Date()))
          .sort((a, b) => b.assigned_at.getTime() - a.assigned_at.getTime())[0];
        
        const location = currentAssignment ? 
          locationsData.find(l => l.id === currentAssignment.location_id) : undefined;

        // Generate stall number based on location and assignment
        const stallNumber = currentAssignment ? 
          `${location?.name}-${String(currentAssignment.id).padStart(3, '0')}` : undefined;

        // Determine location status based on current activity and location type
        let locationStatus: HorseLocation['locationStatus'] = 'stalled';
        if (horse.current_activity) {
          switch (horse.current_activity) {
            case 'racing': locationStatus = 'racing'; break;
            case 'training': locationStatus = 'training'; break;
            case 'walking': locationStatus = 'walking'; break;
            case 'medical': locationStatus = 'medical'; break;
            case 'transport': locationStatus = 'transport'; break;
            default: locationStatus = 'stalled';
          }
        }

        return {
          ...horse,
          owner,
          location,
          currentAssignment,
          stallNumber,
          locationStatus
        };
      });

      setHorsesWithLocations(enhancedHorses);
      setFilteredHorses(enhancedHorses);
      setLocations(locationsData);
      setOwners(ownersData);
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = horsesWithLocations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(horse =>
        horse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        horse.tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        horse.owner?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        horse.location?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        horse.stallNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply owner filter
    if (ownerFilter !== 'all') {
      filtered = filtered.filter(horse => horse.owner_id === parseInt(ownerFilter));
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(horse => horse.location?.id === parseInt(locationFilter));
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(horse => horse.locationStatus === statusFilter);
    }

    setFilteredHorses(filtered);
  }, [horsesWithLocations, searchTerm, ownerFilter, locationFilter, statusFilter]);

  const getStatusColor = (status: HorseLocation['locationStatus']) => {
    switch (status) {
      case 'stalled': return 'bg-green-100 text-green-800 border-green-200';
      case 'walking': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'racing': return 'bg-red-100 text-red-800 border-red-200';
      case 'training': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medical': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'transport': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: HorseLocation['locationStatus']) => {
    switch (status) {
      case 'stalled': return <Home className="h-3 w-3" />;
      case 'walking': return <Activity className="h-3 w-3" />;
      case 'racing': return <Activity className="h-3 w-3" />;
      case 'training': return <Activity className="h-3 w-3" />;
      case 'medical': return <MapPin className="h-3 w-3" />;
      case 'transport': return <Car className="h-3 w-3" />;
      default: return <MapPin className="h-3 w-3" />;
    }
  };

  const groupedByLocation = filteredHorses.reduce((acc, horse) => {
    const locationName = horse.location?.name || 'Unassigned';
    if (!acc[locationName]) {
      acc[locationName] = [];
    }
    acc[locationName].push(horse);
    return acc;
  }, {} as Record<string, HorseLocation[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Location Map</h2>
          <p className="text-muted-foreground">
            Track horse locations and status in real-time
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          Refresh Map
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search horses, stalls, owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map(owner => (
                  <SelectItem key={owner.id} value={owner.id!.toString()}>
                    {owner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id!.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="stalled">Stalled</SelectItem>
                <SelectItem value="walking">Walking</SelectItem>
                <SelectItem value="racing">Racing</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {['stalled', 'walking', 'racing', 'training', 'medical', 'transport'].map(status => {
          const count = filteredHorses.filter(h => h.locationStatus === status).length;
          return (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {getStatusIcon(status as HorseLocation['locationStatus'])}
                </div>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">{status}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Location Map Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Object.entries(groupedByLocation).map(([locationName, horses]) => (
            <Card key={locationName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {locationName}
                  <Badge variant="outline">{horses.length} horses</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {horses.map(horse => (
                    <div
                      key={horse.id}
                      className={`p-4 rounded-lg border-2 ${getStatusColor(horse.locationStatus)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm">{horse.name}</div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(horse.locationStatus)}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div><strong>ID:</strong> {horse.tracking_id}</div>
                        {horse.stallNumber && (
                          <div><strong>Stall:</strong> {horse.stallNumber}</div>
                        )}
                        <div><strong>Owner:</strong> {horse.owner?.name}</div>
                        <div><strong>Status:</strong> {horse.locationStatus}</div>
                        {horse.current_activity && (
                          <div><strong>Activity:</strong> {horse.current_activity}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}