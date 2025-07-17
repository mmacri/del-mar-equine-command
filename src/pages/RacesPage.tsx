import React, { useEffect, useState } from 'react';
import { db, Race, RaceParticipant, Horse } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Calendar, Trophy, Clock, MapPin } from 'lucide-react';

interface RaceWithParticipants extends Race {
  participants: (RaceParticipant & { horse?: Horse })[];
  participantCount: number;
}

export function RacesPage() {
  const [races, setRaces] = useState<RaceWithParticipants[]>([]);
  const [filteredRaces, setFilteredRaces] = useState<RaceWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
      setFilteredRaces(racesWithParticipants);
    } catch (error) {
      console.error('Error loading races:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRaces();
  }, []);

  useEffect(() => {
    let filtered = races;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(race =>
        race.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        race.track.toLowerCase().includes(searchTerm.toLowerCase()) ||
        race.race_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(race => race.status === statusFilter);
    }

    // Apply time filter
    const now = new Date();
    if (timeFilter === 'upcoming') {
      filtered = filtered.filter(race => new Date(race.race_date) > now);
    } else if (timeFilter === 'past') {
      filtered = filtered.filter(race => new Date(race.race_date) <= now);
    } else if (timeFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter(race => {
        const raceDate = new Date(race.race_date);
        return raceDate >= today && raceDate < tomorrow;
      });
    }

    setFilteredRaces(filtered);
  }, [races, searchTerm, statusFilter, timeFilter]);

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
      <Card>
        <CardHeader>
          <CardTitle>Filter Races</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by race name, track, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
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