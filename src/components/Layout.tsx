import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  House as Horse, 
  LogOut, 
  Menu,
  Home,
  AlertTriangle,
  Users,
  Calendar,
  Database,
  FileText,
  Activity,
  Settings
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, roles: ['admin', 'owner', 'viewer'] },
    { name: 'Command Center', href: '/command', icon: Activity, roles: ['admin', 'viewer'] },
    { name: 'Problems', href: '/problems', icon: AlertTriangle, roles: ['admin', 'viewer'] },
    { name: 'Horses', href: '/horses', icon: Horse, roles: ['admin', 'owner', 'viewer'] },
    { name: 'Owners', href: '/owners', icon: Users, roles: ['admin'] },
    { name: 'Races', href: '/races', icon: Calendar, roles: ['admin', 'viewer'] },
    { name: 'Data Grid', href: '/data-grid', icon: Database, roles: ['admin'] },
    { name: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'owner', 'viewer'] },
    { name: 'Season Management', href: '/season-management', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || 'viewer')
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'owner': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <Horse className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Del Mar Equine Command Center</h1>
              <p className="text-sm text-muted-foreground">Horse Management System</p>
            </div>
          </div>
          
          <div className="ml-auto flex items-center space-x-4">
            <Badge variant={getRoleBadgeVariant(user?.role || '')}>
              {user?.role?.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">{user?.username}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 border-r bg-card min-h-[calc(100vh-4rem)]">
          <div className="p-4">
            <div className="space-y-2">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}