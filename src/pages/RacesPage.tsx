import React, { useEffect, useState } from 'react';
import { db, Race, RaceParticipant, Horse } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Calendar, Trophy, Clock, MapPin } from 'lucide-react';
import { UnifiedFilters } from '@/components/UnifiedFilters';
import { useUnifiedFilters, filterFunctions } from '@/hooks/useUnifiedFilters';

interface RaceWithParticipants extends Race {
  participants: (RaceParticipant & { horse?: Horse })[];
  participantCount: number;
}

export function RacesPage() {
  const { filters, filterData, updateFilter, clearFilters, getFilteredData } = useUnifiedFilters();
  const [races, setRaces] = useState<RaceWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<string>('all');

  const loadRaces = async () => {
    setIsLoading(true);
    try {
      const racesData = await db.races.toArray();
      const participants = await db.race_participants.toArray();
      const horses = await db.horses.toArray();

      const racesWithParticipants: RaceWithParticipants[] = racesData.map(race => {
        const raceParticipants = participants
          .filter(p => p.race_id === race.id)
          .map(participant => ({
            ...participant,
            horse: horses.find(h => h.id === participant.horse_id)
          }));

        return {
          ...race,
          participants: raceParticipants,
          participantCount: raceParticipants.length
        };
      });

      // Sort by date (upcoming first, then by date)
      racesWithParticipants.sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());

      setRaces(racesWithParticipants);
    } catch (error) {
      console.error('Error loading races:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRaces();
  }, []);

  // Apply filters
  const baseFilteredRaces = getFilteredData(races, filterFunctions.races);
  
  // Apply additional time filter
  const filteredRaces = baseFilteredRaces.filter(race => {
    const now = new Date();
    if (timeFilter === 'upcoming') {
      return new Date(race.race_date) > now;
    } else if (timeFilter === 'past') {
      return new Date(race.race_date) <= now;
    } else if (timeFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const raceDate = new Date(race.race_date);
      return raceDate >= today && raceDate < tomorrow;
    }
    return true;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'outline';
      case 'running': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const now = new Date();
  const upcomingRaces = races.filter(race => new Date(race.race_date) > now).length;
  const todayRaces = races.filter(race => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const raceDate = new Date(race.race_date);
    return raceDate >= today && raceDate < tomorrow;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Race Management</h1>
          <p className="text-muted-foreground">
            Manage races, participants, and racing schedules
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Race
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Races</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{races.length}</div>
            <p className="text-xs text-muted-foreground">
              All scheduled races
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Races</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todayRaces}</div>
            <p className="text-xs text-muted-foreground">
              Racing today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{upcomingRaces}</div>
            <p className="text-xs text-muted-foreground">
              Future races
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {races.reduce((sum, race) => sum + race.participantCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Horse entries
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
        enabledFilters={['status', 'searchTerm']}
      />
      
      {/* Additional Time Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Time Range:</label>
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Races List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : filteredRaces.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {races.length === 0 ? 'No races scheduled.' : 'No races match your current filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRaces.map((race) => (
            <Card key={race.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <CardTitle className="text-xl">{race.name}</CardTitle>
                      <CardDescription className="flex items-center space-x-4 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(race.race_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {race.track}
                        </span>
                        <span>{race.distance}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge variant={getStatusVariant(race.status)}>
                      {race.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {race.participantCount} horses
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Race Details</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Type:</strong> {race.race_type}</p>
                      <p><strong>Distance:</strong> {race.distance}</p>
                      {race.purse && (
                        <p><strong>Purse:</strong> ${race.purse.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Participants ({race.participantCount})</h4>
                    <div className="text-sm space-y-1 max-h-20 overflow-y-auto">
                      {race.participants.slice(0, 5).map((participant, index) => (
                        <p key={participant.id}>
                          {participant.post_position && `#${participant.post_position} `}
                          {participant.horse?.name || `Horse ${participant.horse_id}`}
                          {participant.jockey_name && ` (${participant.jockey_name})`}
                        </p>
                      ))}
                      {race.participants.length > 5 && (
                        <p className="text-muted-foreground">
                          +{race.participants.length - 5} more horses
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Manage Participants
                  </Button>
                  {race.status === 'scheduled' && (
                    <Button variant="outline" size="sm">
                      Start Race
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