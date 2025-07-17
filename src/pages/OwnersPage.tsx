import React, { useEffect, useState } from 'react';
import { db, Owner, Horse } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Eye, Edit, Users, Map, History } from 'lucide-react';
import { LocationMap } from '@/components/LocationMap';
import { RaceHistoryView } from '@/components/RaceHistoryView';

interface OwnerWithStats extends Owner {
  horseCount: number;
  activeHorses: number;
  inactiveHorses: number;
  injuredHorses: number;
  raceEntries: number;
  stallsOccupied: number;
  horses: Horse[];
}

export function OwnersPage() {
  const [owners, setOwners] = useState<OwnerWithStats[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<OwnerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);
  const [selectedHorse, setSelectedHorse] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('owners');

  const loadOwners = async () => {
    setIsLoading(true);
    try {
      const [ownersData, horses, raceParticipants, locationAssignments] = await Promise.all([
        db.owners.toArray(),
        db.horses.toArray(),
        db.race_participants.toArray(),
        db.location_assignments.toArray()
      ]);

      const ownersWithStats: OwnerWithStats[] = ownersData.map(owner => {
        const ownerHorses = horses.filter(horse => horse.owner_id === owner.id);
        const horseIds = ownerHorses.map(h => h.id);
        const raceEntries = raceParticipants.filter(rp => horseIds.includes(rp.horse_id)).length;
        const stallsOccupied = locationAssignments.filter(la => 
          horseIds.includes(la.horse_id) && 
          (!la.assigned_until || la.assigned_until > new Date())
        ).length;

        return {
          ...owner,
          horseCount: ownerHorses.length,
          activeHorses: ownerHorses.filter(h => h.status === 'active').length,
          inactiveHorses: ownerHorses.filter(h => h.status === 'inactive').length,
          injuredHorses: ownerHorses.filter(h => h.status === 'injured').length,
          raceEntries,
          stallsOccupied,
          horses: ownerHorses
        };
      });

      setOwners(ownersWithStats);
      setFilteredOwners(ownersWithStats);
    } catch (error) {
      console.error('Error loading owners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOwners();
  }, []);

  useEffect(() => {
    let filtered = owners;

    if (searchTerm) {
      filtered = filtered.filter(owner =>
        owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOwners(filtered);
  }, [owners, searchTerm]);

  const totalHorses = owners.reduce((sum, owner) => sum + owner.horseCount, 0);
  const totalActiveHorses = owners.reduce((sum, owner) => sum + owner.activeHorses, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Horse Owners</h1>
          <p className="text-muted-foreground">
            Manage horse owners, track locations, and view race history
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Owner
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="owners" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Owners
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Location Map
          </TabsTrigger>
          <TabsTrigger value="race-history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Race History
          </TabsTrigger>
          <TabsTrigger value="horse-details" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Horse Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owners" className="space-y-6">{/* Original owners content */}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Owners</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{owners.length}</div>
              <p className="text-xs text-muted-foreground">
                Registered horse owners
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Horses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHorses}</div>
              <p className="text-xs text-muted-foreground">
                Across all owners
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Horses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalActiveHorses}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stalls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{owners.reduce((sum, owner) => sum + owner.stallsOccupied, 0)}</div>
              <p className="text-xs text-muted-foreground">
                Currently occupied
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search Owners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or horses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setActiveTab('locations');
                  setSelectedOwner(null);
                }}
              >
                <Map className="h-4 w-4 mr-2" />
                View Map
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setActiveTab('race-history');
                  setSelectedOwner(null);
                }}
              >
                <History className="h-4 w-4 mr-2" />
                Race History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Owners List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <Card className="col-span-full">
              <CardContent className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : filteredOwners.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {owners.length === 0 ? 'No owners found.' : 'No owners match your search.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOwners.map((owner) => (
              <Card key={owner.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{owner.name}</CardTitle>
                      <CardDescription>{owner.email}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{owner.horseCount}</div>
                      <div className="text-xs text-muted-foreground">horses</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {owner.phone && (
                      <p><strong>Phone:</strong> {owner.phone}</p>
                    )}
                    {owner.address && (
                      <p><strong>Address:</strong> {owner.address}</p>
                    )}
                    <p><strong>Race Entries:</strong> {owner.raceEntries}</p>
                    <p><strong>Stalls Occupied:</strong> {owner.stallsOccupied}</p>
                    
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{owner.activeHorses}</div>
                        <div className="text-xs text-muted-foreground">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-600">{owner.inactiveHorses}</div>
                        <div className="text-xs text-muted-foreground">Inactive</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{owner.injuredHorses}</div>
                        <div className="text-xs text-muted-foreground">Injured</div>
                      </div>
                    </div>

                    {/* Quick access to horses */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-xs text-muted-foreground mb-2">Horses:</div>
                      <div className="flex flex-wrap gap-1">
                        {owner.horses.slice(0, 3).map(horse => (
                          <Button
                            key={horse.id}
                            variant="outline"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              setSelectedHorse(horse.id!);
                              setActiveTab('horse-details');
                            }}
                          >
                            {horse.name}
                          </Button>
                        ))}
                        {owner.horses.length > 3 && (
                          <span className="text-xs text-muted-foreground self-center">
                            +{owner.horses.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedOwner(owner.id!);
                        setActiveTab('locations');
                      }}
                    >
                      <Map className="h-3 w-3 mr-1" />
                      Locations
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedOwner(owner.id!);
                        setActiveTab('race-history');
                      }}
                    >
                      <History className="h-3 w-3 mr-1" />
                      Races
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        </TabsContent>

        <TabsContent value="locations">
          <LocationMap 
            filterByOwner={selectedOwner || undefined}
          />
        </TabsContent>

        <TabsContent value="race-history">
          <RaceHistoryView 
            filterByOwner={selectedOwner || undefined}
            viewMode="owner"
          />
        </TabsContent>

        <TabsContent value="horse-details">
          <RaceHistoryView 
            filterByHorse={selectedHorse || undefined}
            viewMode="horse"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}