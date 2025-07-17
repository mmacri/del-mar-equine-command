import React, { useEffect, useState } from 'react';
import { db, Owner, Horse } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Edit, Users } from 'lucide-react';

interface OwnerWithStats extends Owner {
  horseCount: number;
  activeHorses: number;
  inactiveHorses: number;
  injuredHorses: number;
}

export function OwnersPage() {
  const [owners, setOwners] = useState<OwnerWithStats[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<OwnerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadOwners = async () => {
    setIsLoading(true);
    try {
      const ownersData = await db.owners.toArray();
      const horses = await db.horses.toArray();

      const ownersWithStats: OwnerWithStats[] = ownersData.map(owner => {
        const ownerHorses = horses.filter(horse => horse.owner_id === owner.id);
        return {
          ...owner,
          horseCount: ownerHorses.length,
          activeHorses: ownerHorses.filter(h => h.status === 'active').length,
          inactiveHorses: ownerHorses.filter(h => h.status === 'inactive').length,
          injuredHorses: ownerHorses.filter(h => h.status === 'injured').length,
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
            Manage horse owners and their portfolios
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Owner
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Owners</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
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
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}