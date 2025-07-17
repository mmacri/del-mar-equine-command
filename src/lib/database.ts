import Dexie, { Table } from 'dexie';

// Database interfaces matching future SQL schema
export interface User {
  id?: number;
  username: string;
  email: string;
  role: 'admin' | 'owner' | 'viewer';
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Owner {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  user_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Horse {
  id?: number;
  tracking_id: string; // Unique auto-generated ID
  name: string;
  registration_number?: string;
  breed?: string;
  color?: string;
  age?: number;
  gender: 'stallion' | 'mare' | 'gelding' | 'filly' | 'colt';
  owner_id: number;
  status: 'active' | 'inactive' | 'injured' | 'retired';
  current_location_id?: number;
  current_activity?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Location {
  id?: number;
  name: string;
  type: 'stable' | 'paddock' | 'track' | 'barn' | 'medical' | 'quarantine';
  capacity: number;
  current_occupancy: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Activity {
  id?: number;
  horse_id: number;
  activity_type: 'training' | 'racing' | 'walking' | 'resting' | 'medical' | 'transport';
  location_id?: number;
  start_time: Date;
  end_time?: Date;
  notes?: string;
  recorded_by: number; // user_id
  created_at: Date;
}

export interface Race {
  id?: number;
  name: string;
  race_date: Date;
  track: string;
  distance: string;
  purse?: number;
  race_type: string;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface RaceParticipant {
  id?: number;
  race_id: number;
  horse_id: number;
  jockey_name?: string;
  post_position?: number;
  odds?: string;
  finish_position?: number;
  created_at: Date;
}

export interface VeterinaryRecord {
  id?: number;
  horse_id: number;
  examination_date: Date;
  veterinarian: string;
  diagnosis?: string;
  treatment?: string;
  medications?: string;
  notes?: string;
  follow_up_required: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DrugTest {
  id?: number;
  horse_id: number;
  race_id?: number;
  test_date: Date;
  test_type: 'pre_race' | 'post_race' | 'random' | 'follow_up';
  status: 'pending' | 'passed' | 'failed' | 'inconclusive';
  substances_tested?: string;
  results?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LocationAssignment {
  id?: number;
  horse_id: number;
  location_id: number;
  assigned_at: Date;
  assigned_until?: Date;
  assigned_by: number; // user_id
  notes?: string;
}

// Database class
export class EquineDatabase extends Dexie {
  users!: Table<User>;
  owners!: Table<Owner>;
  horses!: Table<Horse>;
  locations!: Table<Location>;
  activities!: Table<Activity>;
  races!: Table<Race>;
  race_participants!: Table<RaceParticipant>;
  veterinary_records!: Table<VeterinaryRecord>;
  drug_tests!: Table<DrugTest>;
  location_assignments!: Table<LocationAssignment>;

  constructor() {
    super('EquineCommandCenter');
    
    this.version(1).stores({
      users: '++id, username, email, role',
      owners: '++id, name, email, user_id',
      horses: '++id, tracking_id, name, owner_id, status, current_location_id',
      locations: '++id, name, type',
      activities: '++id, horse_id, activity_type, start_time, recorded_by',
      races: '++id, name, race_date, status',
      race_participants: '++id, race_id, horse_id',
      veterinary_records: '++id, horse_id, examination_date',
      drug_tests: '++id, horse_id, race_id, test_date, status',
      location_assignments: '++id, horse_id, location_id, assigned_at'
    });
  }
}

export const db = new EquineDatabase();

// Initialize default data
export async function initializeDatabase() {
  // Check if already initialized
  const userCount = await db.users.count();
  if (userCount > 0) return;

  // Create default admin user
  const adminUserId = await db.users.add({
    username: 'admin',
    email: 'admin@delmar.com',
    role: 'admin',
    password_hash: 'admin123', // In real app, this would be properly hashed
    created_at: new Date(),
    updated_at: new Date()
  });

  // Create default viewer user
  await db.users.add({
    username: 'viewer',
    email: 'viewer@delmar.com',
    role: 'viewer',
    password_hash: 'viewer123',
    created_at: new Date(),
    updated_at: new Date()
  });

  // Create sample owners
  const owner1Id = await db.owners.add({
    name: 'John Smith Racing',
    email: 'john@smithracing.com',
    phone: '555-0101',
    created_at: new Date(),
    updated_at: new Date()
  });

  const owner2Id = await db.owners.add({
    name: 'Golden Gate Stables',
    email: 'info@goldengatestables.com',
    phone: '555-0102',
    created_at: new Date(),
    updated_at: new Date()
  });

  // Create owner users
  await db.users.add({
    username: 'johnsmith',
    email: 'john@smithracing.com',
    role: 'owner',
    password_hash: 'owner123',
    created_at: new Date(),
    updated_at: new Date()
  });

  await db.users.add({
    username: 'goldengate',
    email: 'info@goldengatestables.com',
    role: 'owner',
    password_hash: 'owner123',
    created_at: new Date(),
    updated_at: new Date()
  });

  // Create default locations
  await db.locations.bulkAdd([
    {
      name: 'Barn A',
      type: 'barn',
      capacity: 50,
      current_occupancy: 0,
      description: 'Main training barn',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Barn B',
      type: 'barn',
      capacity: 40,
      current_occupancy: 0,
      description: 'Secondary barn',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Main Track',
      type: 'track',
      capacity: 20,
      current_occupancy: 0,
      description: 'Primary racing track',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Training Track',
      type: 'track',
      capacity: 15,
      current_occupancy: 0,
      description: 'Training and exercise track',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Paddock 1',
      type: 'paddock',
      capacity: 10,
      current_occupancy: 0,
      description: 'Large paddock for turnout',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Medical Bay',
      type: 'medical',
      capacity: 5,
      current_occupancy: 0,
      description: 'Veterinary treatment area',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // Create sample horses
  const horses = [];
  for (let i = 1; i <= 50; i++) {
    horses.push({
      tracking_id: `DM${new Date().getFullYear()}${String(i).padStart(4, '0')}`,
      name: `Horse ${i}`,
      registration_number: `REG${i}`,
      breed: ['Thoroughbred', 'Quarter Horse', 'Arabian'][i % 3],
      color: ['Bay', 'Chestnut', 'Black', 'Gray'][i % 4],
      age: 3 + (i % 5),
      gender: ['stallion', 'mare', 'gelding'][i % 3] as 'stallion' | 'mare' | 'gelding',
      owner_id: i % 2 === 0 ? owner1Id : owner2Id,
      status: 'active' as const,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  await db.horses.bulkAdd(horses);

  console.log('Database initialized with sample data');
}