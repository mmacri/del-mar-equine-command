import React, { useEffect, useState } from 'react';
import { db, Horse, Race, RaceParticipant, Owner } from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Trophy, Calendar, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';

interface RaceHistory extends Race {
  participants: (RaceParticipant & { horse?: Horse; owner?: Owner })[];
  participantCount: number;
}

interface RaceHistoryViewProps {
  filterByHorse?: number;
  filterByOwner?: number;
  viewMode?: 'horse' | 'race' | 'owner';
}

export function RaceHistoryView({ filterByHorse, filterByOwner, viewMode = 'race' }: RaceHistoryViewProps) {
  const [raceHistory, setRaceHistory] = useState<RaceHistory[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [filteredData, setFilteredData] = useState<RaceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [horseFilter, setHorseFilter] = useState<string>(filterByHorse?.toString() || 'all');
  const [ownerFilter, setOwnerFilter] = useState<string>(filterByOwner?.toString() || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [racesData, participantsData, horsesData, ownersData] = await Promise.all([
        db.races.toArray(),
        db.race_participants.toArray(),
        db.horses.toArray(),
        db.owners.toArray()
      ]);

      // Create race history with participants
      const raceHistoryData: RaceHistory[] = racesData.map(race => {
        const raceParticipants = participantsData
          .filter(p => p.race_id === race.id)
          .map(participant => {
            const horse = horsesData.find(h => h.id === participant.horse_id);
            const owner = horse ? ownersData.find(o => o.id === horse.owner_id) : undefined;
            return { ...participant, horse, owner };
          });

        return {
          ...race,
          participants: raceParticipants,
          participantCount: raceParticipants.length
        };
      });

      // Sort by race date (most recent first)
      raceHistoryData.sort((a, b) => b.race_date.getTime() - a.race_date.getTime());

      setRaceHistory(raceHistoryData);
      setFilteredData(raceHistoryData);
      setHorses(horsesData);
      setOwners(ownersData);
    } catch (error) {
      console.error('Error loading race history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = raceHistory;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(race =>
        race.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        race.track.toLowerCase().includes(searchTerm.toLowerCase()) ||
        race.participants.some(p => 
          p.horse?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.owner?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.jockey_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply horse filter
    if (horseFilter !== 'all') {
      filtered = filtered.filter(race =>
        race.participants.some(p => p.horse_id === parseInt(horseFilter))
      );
    }

    // Apply owner filter
    if (ownerFilter !== 'all') {
      filtered = filtered.filter(race =>
        race.participants.some(p => p.owner?.id === parseInt(ownerFilter))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(race => race.status === statusFilter);
    }

    // Apply season filter
    if (seasonFilter !== 'all') {
      const year = parseInt(seasonFilter);
      filtered = filtered.filter(race => race.race_date.getFullYear() === year);
    }

    setFilteredData(filtered);
  }, [raceHistory, searchTerm, horseFilter, ownerFilter, statusFilter, seasonFilter]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'scheduled': return 'secondary';
      case 'running': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getPositionColor = (position?: number) => {
    if (!position) return 'text-gray-500';
    if (position === 1) return 'text-yellow-600 font-bold';
    if (position === 2) return 'text-gray-600 font-semibold';
    if (position === 3) return 'text-amber-600 font-semibold';
    return 'text-gray-500';
  };

  const availableSeasons = [...new Set(raceHistory.map(r => r.race_date.getFullYear()))]
    .sort((a, b) => b - a);

  // Group data by view mode
  const groupedData = React.useMemo(() => {
    if (viewMode === 'horse') {
      const grouped = {} as Record<string, { horse: Horse; races: RaceHistory[]; owner?: Owner }>;
      filteredData.forEach(race => {
        race.participants.forEach(participant => {
          if (participant.horse) {
            const key = participant.horse.id!.toString();
            if (!grouped[key]) {
              grouped[key] = {
                horse: participant.horse,
                owner: participant.owner,
                races: []
              };
            }
            grouped[key].races.push(race);
          }
        });
      });
      return grouped;
    } else if (viewMode === 'owner') {
      const grouped = {} as Record<string, { owner: Owner; races: RaceHistory[]; horses: Set<string> }>;
      filteredData.forEach(race => {
        race.participants.forEach(participant => {
          if (participant.owner) {
            const key = participant.owner.id!.toString();
            if (!grouped[key]) {
              grouped[key] = {
                owner: participant.owner,
                races: [],
                horses: new Set()
              };
            }
            grouped[key].races.push(race);
            if (participant.horse) {
              grouped[key].horses.add(participant.horse.name);
            }
          }
        });
      });
      return grouped;
    }
    return null;
  }, [filteredData, viewMode]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Race History</h2>
          <p className="text-muted-foreground">
            Track race participation and performance across the season
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Race History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search races, horses, owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={horseFilter} onValueChange={setHorseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Horse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Horses</SelectItem>
                {horses.map(horse => (
                  <SelectItem key={horse.id} value={horse.id!.toString()}>
                    {horse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={seasonFilter} onValueChange={setSeasonFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {availableSeasons.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} Season
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content based on view mode */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      ) : viewMode === 'race' ? (
        // Race view
        <div className="grid gap-4">
          {filteredData.map(race => (
            <Card key={race.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {race.name}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(race.race_date, 'MMM dd, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {race.track}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {race.participantCount} horses
                      </span>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(race.status)}>
                    {race.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {race.participants.map(participant => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{participant.horse?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {participant.owner?.name}
                          </div>
                          {participant.jockey_name && (
                            <div className="text-xs text-muted-foreground">
                              Jockey: {participant.jockey_name}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {participant.finish_position && (
                            <div className={`text-lg ${getPositionColor(participant.finish_position)}`}>
                              #{participant.finish_position}
                            </div>
                          )}
                          {participant.post_position && (
                            <div className="text-xs text-muted-foreground">
                              Post: {participant.post_position}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'horse' && groupedData ? (
        // Horse view
        <div className="grid gap-4">
          {Object.values(groupedData as any).map((item: any) => (
            <Card key={item.horse.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {item.horse.name}
                  <Badge variant="outline">{item.races.length} races</Badge>
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Owner: {item.owner?.name} | ID: {item.horse.tracking_id}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {item.races.map((race: RaceHistory) => {
                    const participation = race.participants.find(p => p.horse_id === item.horse.id);
                    return (
                      <div
                        key={race.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                      >
                        <div>
                          <div className="font-medium">{race.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(race.race_date, 'MMM dd, yyyy')} • {race.track}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusVariant(race.status)} className="text-xs">
                            {race.status}
                          </Badge>
                          {participation?.finish_position && (
                            <div className={`text-sm ${getPositionColor(participation.finish_position)}`}>
                              #{participation.finish_position}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'owner' && groupedData ? (
        // Owner view
        <div className="grid gap-4">
          {Object.values(groupedData as any).map((item: any) => (
            <Card key={item.owner.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {item.owner.name}
                  <Badge variant="outline">{item.races.length} race entries</Badge>
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Horses: {Array.from(item.horses).join(', ')}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {item.races.map((race: RaceHistory) => {
                    const ownerParticipants = race.participants.filter(p => p.owner?.id === item.owner.id);
                    return (
                      <div
                        key={race.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                      >
                        <div>
                          <div className="font-medium">{race.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(race.race_date, 'MMM dd, yyyy')} • {race.track}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Horses: {ownerParticipants.map(p => p.horse?.name).join(', ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusVariant(race.status)} className="text-xs">
                            {race.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {ownerParticipants.length} entries
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}