import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, Plus, Minus, Users, Calendar, MapPin } from 'lucide-react';
import { db, Horse as HorseType, Owner, Location, Race } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

interface SeasonData {
  season: string;
  racetrack: string;
  horses: HorseType[];
  owners: Owner[];
  races: Race[];
}

export default function SeasonManagementPage() {
  const [seasons, setSeasons] = useState<string[]>(['2024', '2025']);
  const [racetracks, setRacetracks] = useState<string[]>(['Del Mar', 'Santa Anita', 'Golden Gate Fields']);
  const [selectedSeason, setSelectedSeason] = useState('2024');
  const [selectedRacetrack, setSelectedRacetrack] = useState('Del Mar');
  const [horses, setHorses] = useState<HorseType[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedHorses, setSelectedHorses] = useState<number[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [selectedSeason, selectedRacetrack]);

  const loadData = async () => {
    try {
      const [horsesData, ownersData, locationsData] = await Promise.all([
        db.horses.toArray(),
        db.owners.toArray(),
        db.locations.toArray()
      ]);
      setHorses(horsesData);
      setOwners(ownersData);
      setLocations(locationsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
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
    setSelectedHorses(selectedHorses.length === horses.length ? [] : horses.map(h => h.id!));
  };

  const handleBulkRemove = async () => {
    if (selectedHorses.length === 0) return;
    
    try {
      await db.horses.bulkDelete(selectedHorses);
      setSelectedHorses([]);
      await loadData();
      toast({
        title: "Success",
        description: `Removed ${selectedHorses.length} horses from ${selectedSeason} season`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove horses",
        variant: "destructive",
      });
    }
  };

  const handleOwnerBulkAction = async (action: 'add' | 'remove') => {
    if (!selectedOwner) return;
    
    const ownerHorses = horses.filter(h => h.owner_id === parseInt(selectedOwner));
    
    if (action === 'remove') {
      try {
        await db.horses.bulkDelete(ownerHorses.map(h => h.id!));
        await loadData();
        toast({
          title: "Success",
          description: `Removed all horses for selected owner from ${selectedSeason} season`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove owner's horses",
          variant: "destructive",
        });
      }
    }
  };

  const generateCSVExport = () => {
    // Create horses CSV data
    const horsesData = horses.map(horse => ({
      Season: selectedSeason,
      Racetrack: selectedRacetrack,
      HorseID: horse.id,
      HorseName: horse.name,
      Age: horse.age,
      Breed: horse.breed,
      Color: horse.color,
      Gender: horse.gender,
      Status: horse.status,
      TrackingID: horse.tracking_id,
      OwnerName: owners.find(o => o.id === horse.owner_id)?.name || '',
      OwnerEmail: owners.find(o => o.id === horse.owner_id)?.email || '',
      OwnerPhone: owners.find(o => o.id === horse.owner_id)?.phone || '',
      LocationName: locations.find(l => l.id === horse.current_location_id)?.name || '',
      LocationType: locations.find(l => l.id === horse.current_location_id)?.type || '',
      CurrentActivity: horse.current_activity
    }));

    const csv = Papa.unparse(horsesData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horses-${selectedSeason}-${selectedRacetrack}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${horses.length} horses for ${selectedSeason} season as CSV`,
    });
  };

  const handleCSVImport = async () => {
    if (!csvFile) return;

    try {
      const text = await csvFile.text();
      
      Papa.parse(text, {
        header: true,
        complete: async (results) => {
          try {
            const data = results.data as any[];
            
            if (data.length === 0) {
              throw new Error('CSV file is empty');
            }

            // Validate required columns
            const requiredColumns = ['Season', 'Racetrack', 'HorseName', 'OwnerName', 'OwnerEmail'];
            const firstRow = data[0];
            const missingColumns = requiredColumns.filter(col => !(col in firstRow));
            
            if (missingColumns.length > 0) {
              throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
            }

            // Validate season and racetrack
            const importSeason = firstRow.Season;
            const importRacetrack = firstRow.Racetrack;
            
            if (importSeason !== selectedSeason) {
              throw new Error(`CSV is for season ${importSeason}, but you have ${selectedSeason} selected. Please switch to the correct season first.`);
            }
            
            if (importRacetrack !== selectedRacetrack) {
              throw new Error(`CSV is for racetrack ${importRacetrack}, but you have ${selectedRacetrack} selected. Please switch to the correct racetrack first.`);
            }

            // Process owners first
            const uniqueOwners = Array.from(new Map(
              data.map(row => [`${row.OwnerName}-${row.OwnerEmail}`, {
                name: row.OwnerName,
                email: row.OwnerEmail,
                phone: row.OwnerPhone || '',
                address: row.OwnerAddress || ''
              }])
            ).values());

            for (const owner of uniqueOwners) {
              const existingOwner = await db.owners.where('email').equals(owner.email).first();
              if (!existingOwner) {
                await db.owners.add({
                  name: owner.name,
                  email: owner.email,
                  phone: owner.phone,
                  address: owner.address,
                  created_at: new Date(),
                  updated_at: new Date()
                });
              }
            }

            // Process locations
            const uniqueLocations = Array.from(new Map(
              data.filter(row => row.LocationName).map(row => [row.LocationName, {
                name: row.LocationName,
                type: row.LocationType || 'Stable',
                capacity: 50
              }])
            ).values());

            for (const location of uniqueLocations) {
              const existingLocation = await db.locations.where('name').equals(location.name).first();
              if (!existingLocation) {
                await db.locations.add({
                  name: location.name,
                  type: location.type,
                  capacity: location.capacity,
                  current_occupancy: 0,
                  created_at: new Date(),
                  updated_at: new Date()
                });
              }
            }

            // Refresh data to get new IDs
            const [newOwners, newLocations] = await Promise.all([
              db.owners.toArray(),
              db.locations.toArray()
            ]);

            // Process horses
            let importedCount = 0;
            for (const row of data) {
              if (!row.HorseName) continue;

              const owner = newOwners.find(o => o.name === row.OwnerName && o.email === row.OwnerEmail);
              const location = newLocations.find(l => l.name === row.LocationName);
              
              const trackingId = row.TrackingID || `TRK${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              const existingHorse = await db.horses.where('tracking_id').equals(trackingId).first();
              if (!existingHorse) {
                await db.horses.add({
                  name: row.HorseName,
                  age: parseInt(row.Age) || 3,
                  breed: row.Breed || 'Thoroughbred',
                  color: row.Color || 'Bay',
                  gender: row.Gender || 'gelding',
                  status: row.Status || 'active',
                  tracking_id: trackingId,
                  owner_id: owner?.id || 1,
                  current_location_id: location?.id || 1,
                  current_activity: row.CurrentActivity || 'Stabled',
                  created_at: new Date(),
                  updated_at: new Date()
                });
                importedCount++;
              }
            }

            await loadData();
            setCsvFile(null);
            setIsImportDialogOpen(false);
            
            toast({
              title: "Import Complete",
              description: `Imported ${importedCount} horses for ${selectedSeason} season`,
            });
          } catch (error) {
            toast({
              title: "Import Error",
              description: error instanceof Error ? error.message : "Failed to import CSV data",
              variant: "destructive",
            });
          }
        },
        error: (error) => {
          toast({
            title: "Parse Error",
            description: "Failed to parse CSV file",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      toast({
        title: "File Error",
        description: "Failed to read CSV file",
        variant: "destructive",
      });
    }
  };

  const getOwnerName = (ownerId: number) => {
    return owners.find(o => o.id === ownerId)?.name || 'Unknown';
  };

  const getLocationName = (locationId?: number) => {
    if (!locationId) return 'Unknown';
    return locations.find(l => l.id === locationId)?.name || 'Unknown';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Season Management</h1>
          <p className="text-muted-foreground">
            Manage horses, owners, and locations across racing seasons
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {selectedSeason} - {selectedRacetrack}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Horses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{horses.length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedHorses.length} selected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Owners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{owners.length}</div>
            <p className="text-xs text-muted-foreground">
              With registered horses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground">
              Available stalls & areas
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manage">Manage Horses</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="import-export">Import/Export</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="season">Season:</Label>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map(season => (
                    <SelectItem key={season} value={season}>{season}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="racetrack">Racetrack:</Label>
              <Select value={selectedRacetrack} onValueChange={setSelectedRacetrack}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {racetracks.map(track => (
                    <SelectItem key={track} value={track}>{track}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
            >
              {selectedHorses.length === horses.length ? 'Deselect All' : 'Select All'}
            </Button>

            {selectedHorses.length > 0 && (
              <Button 
                onClick={handleBulkRemove}
                variant="destructive"
                size="sm"
              >
                <Minus className="h-4 w-4 mr-2" />
                Remove Selected ({selectedHorses.length})
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Horses in {selectedSeason} Season</CardTitle>
              <CardDescription>
                Select horses to perform bulk operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Horse</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {horses.map((horse) => (
                    <TableRow key={horse.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedHorses.includes(horse.id!)}
                          onCheckedChange={() => handleSelectHorse(horse.id!)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{horse.name}</TableCell>
                      <TableCell>{getOwnerName(horse.owner_id)}</TableCell>
                      <TableCell>{getLocationName(horse.current_location_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{horse.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{horse.tracking_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Operations by Owner</CardTitle>
                <CardDescription>
                  Add or remove all horses for a specific owner
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="owner-select">Select Owner</Label>
                  <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map(owner => (
                        <SelectItem key={owner.id} value={owner.id!.toString()}>
                          {owner.name} ({horses.filter(h => h.owner_id === owner.id).length} horses)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleOwnerBulkAction('remove')}
                    variant="destructive"
                    disabled={!selectedOwner}
                    className="flex-1"
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Remove All
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Season Operations</CardTitle>
                <CardDescription>
                  Manage entire seasons and racetracks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Season: {selectedSeason}</Label>
                  <p className="text-sm text-muted-foreground">
                    {horses.length} horses registered for this season
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    New Season
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <MapPin className="h-4 w-4 mr-2" />
                    Clone Season
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>
                  Download complete season data including horses, owners, and locations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Export includes:</Label>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• All horse records with complete details</li>
                    <li>• Owner information and contact details</li>
                    <li>• Location assignments and capacity</li>
                    <li>• Medical, training, and performance notes</li>
                    <li>• Season and racetrack metadata</li>
                  </ul>
                </div>
                
                <Button onClick={generateCSVExport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Season Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import Data</CardTitle>
                <CardDescription>
                  Upload season data to populate horses, owners, and locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Season Data
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import Season Data</DialogTitle>
                      <DialogDescription>
                        Upload a CSV file to import horses, owners, and locations. The CSV must include columns: Season, Racetrack, HorseName, OwnerName, OwnerEmail.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="csv-file">CSV File</Label>
                        <Input
                          id="csv-file"
                          type="file"
                          accept=".csv"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                        {csvFile && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium">Required CSV columns:</p>
                        <ul className="mt-1 space-y-1">
                          <li>• Season, Racetrack, HorseName, OwnerName, OwnerEmail</li>
                          <li>• Optional: Age, Breed, Color, Gender, Status, TrackingID, OwnerPhone, LocationName, LocationType, CurrentActivity</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleCSVImport} disabled={!csvFile}>
                          Import CSV Data
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setCsvFile(null);
                            setIsImportDialogOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}