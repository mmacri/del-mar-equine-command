import React, { useEffect, useState } from 'react';
import { db, Horse, Owner, Location } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Upload, Download, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

interface BulkOperation {
  type: 'add' | 'delete';
  horses: Partial<Horse>[];
  owners: Partial<Owner>[];
}

export function HorseOwnerManagement() {
  const { toast } = useToast();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedHorses, setSelectedHorses] = useState<number[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<number[]>([]);
  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);
  const [isAddOwnerDialogOpen, setIsAddOwnerDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [newHorse, setNewHorse] = useState<Partial<Horse>>({
    name: '',
    registration_number: '',
    breed: '',
    color: '',
    age: undefined,
    gender: 'gelding',
    status: 'active',
    current_activity: ''
  });
  
  const [newOwner, setNewOwner] = useState<Partial<Owner>>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

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
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate unique tracking ID for horses
  const generateTrackingId = async (): Promise<string> => {
    const year = new Date().getFullYear();
    let attempts = 0;
    let trackingId = '';
    
    do {
      attempts++;
      const randomNum = Math.floor(Math.random() * 9999) + 1;
      trackingId = `DM${year}${String(randomNum).padStart(4, '0')}`;
      
      const existing = await db.horses.where('tracking_id').equals(trackingId).first();
      if (!existing) break;
      
      if (attempts > 100) {
        throw new Error('Failed to generate unique tracking ID after 100 attempts');
      }
    } while (true);
    
    return trackingId;
  };

  // Validate unique email for owners
  const validateOwnerEmail = async (email: string, excludeId?: number): Promise<boolean> => {
    const existing = await db.owners.where('email').equals(email).first();
    return !existing || existing.id === excludeId;
  };

  // Add single horse
  const addHorse = async () => {
    if (!newHorse.name || !newHorse.owner_id) {
      toast({
        title: "Validation Error",
        description: "Name and owner are required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const trackingId = await generateTrackingId();
      const horseData: Omit<Horse, 'id'> = {
        ...newHorse as Horse,
        tracking_id: trackingId,
        created_at: new Date(),
        updated_at: new Date()
      };

      await db.horses.add(horseData);
      toast({
        title: "Success",
        description: `Horse ${newHorse.name} added successfully`,
      });
      
      setIsAddHorseDialogOpen(false);
      setNewHorse({
        name: '',
        registration_number: '',
        breed: '',
        color: '',
        age: undefined,
        gender: 'gelding',
        status: 'active',
        current_activity: ''
      });
      loadData();
    } catch (error) {
      console.error('Error adding horse:', error);
      toast({
        title: "Error",
        description: "Failed to add horse",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add single owner
  const addOwner = async () => {
    if (!newOwner.name || !newOwner.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const isEmailUnique = await validateOwnerEmail(newOwner.email!);
      if (!isEmailUnique) {
        toast({
          title: "Validation Error",
          description: "Email address already exists",
          variant: "destructive"
        });
        return;
      }

      const ownerData: Omit<Owner, 'id'> = {
        ...newOwner as Owner,
        created_at: new Date(),
        updated_at: new Date()
      };

      await db.owners.add(ownerData);
      toast({
        title: "Success",
        description: `Owner ${newOwner.name} added successfully`,
      });
      
      setIsAddOwnerDialogOpen(false);
      setNewOwner({
        name: '',
        email: '',
        phone: '',
        address: ''
      });
      loadData();
    } catch (error) {
      console.error('Error adding owner:', error);
      toast({
        title: "Error",
        description: "Failed to add owner",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete selected horses
  const deleteSelectedHorses = async () => {
    if (selectedHorses.length === 0) return;

    setIsLoading(true);
    try {
      await db.horses.bulkDelete(selectedHorses);
      toast({
        title: "Success",
        description: `${selectedHorses.length} horse(s) deleted successfully`,
      });
      setSelectedHorses([]);
      loadData();
    } catch (error) {
      console.error('Error deleting horses:', error);
      toast({
        title: "Error",
        description: "Failed to delete horses",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete selected owners
  const deleteSelectedOwners = async () => {
    if (selectedOwners.length === 0) return;

    // Check if any selected owners have horses
    const ownersWithHorses = owners.filter(owner => 
      selectedOwners.includes(owner.id!) && 
      horses.some(horse => horse.owner_id === owner.id)
    );

    if (ownersWithHorses.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `${ownersWithHorses.length} owner(s) have horses assigned. Remove horses first.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await db.owners.bulkDelete(selectedOwners);
      toast({
        title: "Success",
        description: `${selectedOwners.length} owner(s) deleted successfully`,
      });
      setSelectedOwners([]);
      loadData();
    } catch (error) {
      console.error('Error deleting owners:', error);
      toast({
        title: "Error",
        description: "Failed to delete owners",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk CSV import
  const handleBulkImport = async () => {
    if (!bulkFile) return;

    setIsLoading(true);
    try {
      const text = await bulkFile.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      
      if (result.errors.length > 0) {
        toast({
          title: "CSV Error",
          description: "Failed to parse CSV file",
          variant: "destructive"
        });
        return;
      }

      const data = result.data as any[];
      const newOwners: Omit<Owner, 'id'>[] = [];
      const newHorses: Omit<Horse, 'id'>[] = [];
      const ownerEmailMap = new Map<string, number>();

      // First pass: create owners
      for (const row of data) {
        if (row.owner_name && row.owner_email && !ownerEmailMap.has(row.owner_email)) {
          const isEmailUnique = await validateOwnerEmail(row.owner_email);
          if (isEmailUnique) {
            const ownerId = await db.owners.add({
              name: row.owner_name,
              email: row.owner_email,
              phone: row.owner_phone || '',
              address: row.owner_address || '',
              created_at: new Date(),
              updated_at: new Date()
            });
            ownerEmailMap.set(row.owner_email, ownerId);
          }
        }
      }

      // Second pass: create horses
      for (const row of data) {
        if (row.horse_name && row.owner_email) {
          let ownerId = ownerEmailMap.get(row.owner_email);
          
          if (!ownerId) {
            // Find existing owner
            const existingOwner = await db.owners.where('email').equals(row.owner_email).first();
            if (existingOwner) {
              ownerId = existingOwner.id!;
            }
          }

          if (ownerId) {
            const trackingId = await generateTrackingId();
            await db.horses.add({
              tracking_id: trackingId,
              name: row.horse_name,
              registration_number: row.registration_number || '',
              breed: row.breed || '',
              color: row.color || '',
              age: row.age ? parseInt(row.age) : undefined,
              gender: row.gender || 'gelding',
              owner_id: ownerId,
              status: row.status || 'active',
              current_activity: row.current_activity || '',
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }
      }

      toast({
        title: "Success",
        description: "Bulk import completed successfully",
      });
      
      setIsBulkDialogOpen(false);
      setBulkFile(null);
      loadData();
    } catch (error) {
      console.error('Error during bulk import:', error);
      toast({
        title: "Error",
        description: "Failed to import data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Export data as CSV
  const exportData = () => {
    const exportData = horses.map(horse => {
      const owner = owners.find(o => o.id === horse.owner_id);
      const location = locations.find(l => l.id === horse.current_location_id);
      
      return {
        horse_name: horse.name,
        tracking_id: horse.tracking_id,
        registration_number: horse.registration_number,
        breed: horse.breed,
        color: horse.color,
        age: horse.age,
        gender: horse.gender,
        status: horse.status,
        current_activity: horse.current_activity,
        current_location: location?.name || '',
        owner_name: owner?.name || '',
        owner_email: owner?.email || '',
        owner_phone: owner?.phone || '',
        owner_address: owner?.address || ''
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horses_owners_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Horse & Owner Management</h2>
          <p className="text-muted-foreground">
            Centralized management with bulk operations and duplicate prevention
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Import from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with columns: horse_name, owner_name, owner_email, registration_number, breed, etc.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-file">CSV File</Label>
                  <Input
                    id="bulk-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkImport} disabled={!bulkFile || isLoading}>
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Dialog open={isAddHorseDialogOpen} onOpenChange={setIsAddHorseDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Add Horse</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Horse</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="horse-name">Name *</Label>
                    <Input
                      id="horse-name"
                      value={newHorse.name}
                      onChange={(e) => setNewHorse(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="horse-owner">Owner *</Label>
                    <Select 
                      value={newHorse.owner_id?.toString()} 
                      onValueChange={(value) => setNewHorse(prev => ({ ...prev, owner_id: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {owners.map(owner => (
                          <SelectItem key={owner.id} value={owner.id!.toString()}>
                            {owner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="horse-age">Age</Label>
                      <Input
                        id="horse-age"
                        type="number"
                        value={newHorse.age || ''}
                        onChange={(e) => setNewHorse(prev => ({ ...prev, age: e.target.value ? parseInt(e.target.value) : undefined }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="horse-gender">Gender</Label>
                      <Select 
                        value={newHorse.gender} 
                        onValueChange={(value) => setNewHorse(prev => ({ ...prev, gender: value as Horse['gender'] }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stallion">Stallion</SelectItem>
                          <SelectItem value="mare">Mare</SelectItem>
                          <SelectItem value="gelding">Gelding</SelectItem>
                          <SelectItem value="filly">Filly</SelectItem>
                          <SelectItem value="colt">Colt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddHorseDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addHorse} disabled={isLoading}>
                    Add Horse
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddOwnerDialogOpen} onOpenChange={setIsAddOwnerDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">Add Owner</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Owner</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="owner-name">Name *</Label>
                    <Input
                      id="owner-name"
                      value={newOwner.name}
                      onChange={(e) => setNewOwner(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="owner-email">Email *</Label>
                    <Input
                      id="owner-email"
                      type="email"
                      value={newOwner.email}
                      onChange={(e) => setNewOwner(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="owner-phone">Phone</Label>
                    <Input
                      id="owner-phone"
                      value={newOwner.phone}
                      onChange={(e) => setNewOwner(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOwnerDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addOwner} disabled={isLoading}>
                    Add Owner
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Bulk Delete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={deleteSelectedHorses}
              disabled={selectedHorses.length === 0 || isLoading}
            >
              Delete {selectedHorses.length} Horse(s)
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={deleteSelectedOwners}
              disabled={selectedOwners.length === 0 || isLoading}
            >
              Delete {selectedOwners.length} Owner(s)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Horses Management */}
      <Card>
        <CardHeader>
          <CardTitle>Horses ({horses.length})</CardTitle>
          <CardDescription>Select horses for bulk operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {horses.map(horse => {
              const owner = owners.find(o => o.id === horse.owner_id);
              return (
                <div key={horse.id} className="flex items-center space-x-2 p-2 border rounded">
                  <Checkbox
                    checked={selectedHorses.includes(horse.id!)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedHorses([...selectedHorses, horse.id!]);
                      } else {
                        setSelectedHorses(selectedHorses.filter(id => id !== horse.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{horse.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {horse.tracking_id} • Owner: {owner?.name} • Status: {horse.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Owners Management */}
      <Card>
        <CardHeader>
          <CardTitle>Owners ({owners.length})</CardTitle>
          <CardDescription>Select owners for bulk operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {owners.map(owner => {
              const horseCount = horses.filter(h => h.owner_id === owner.id).length;
              const hasHorses = horseCount > 0;
              return (
                <div key={owner.id} className="flex items-center space-x-2 p-2 border rounded">
                  <Checkbox
                    checked={selectedOwners.includes(owner.id!)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedOwners([...selectedOwners, owner.id!]);
                      } else {
                        setSelectedOwners(selectedOwners.filter(id => id !== owner.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {owner.name}
                      {hasHorses && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {owner.email} • {horseCount} horse(s)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}