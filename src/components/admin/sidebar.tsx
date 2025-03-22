'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Gift,
  Table,
  Mail,
  CheckSquare,
  Key,
} from 'lucide-react';

const routes = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin/dashboard',
    pattern: /^\/admin\/dashboard$/,
  },
  {
    label: 'Tables',
    icon: Table,
    href: '/admin/dashboard/tables',
    pattern: /^\/admin\/dashboard\/tables/,
  },
  {
    label: 'Ushers',
    icon: Users,
    href: '/admin/dashboard/hosts',
    pattern: /^\/admin\/dashboard\/hosts/,
  },
  {
    label: 'Souvenirs',
    icon: Gift,
    href: '/admin/dashboard/souvenirs',
    pattern: /^\/admin\/dashboard\/souvenirs/,
  },
  {
    label: 'Access Codes',
    icon: Key,
    href: '/admin/dashboard/access-codes',
    pattern: /^\/admin\/dashboard\/access-codes/,
  },
  {
    label: 'Sent Invites',
    icon: Mail,
    href: '/admin/dashboard/sent-invites',
    pattern: /^\/admin\/dashboard\/sent-invites/,
  },
  {
    label: 'RSVPs',
    icon: CheckSquare,
    href: '/admin/dashboard/rsvps',
    pattern: /^\/admin\/dashboard\/rsvps/,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="h-full bg-gray-100 border-r">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Admin Dashboard</h2>
        <nav className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                route.pattern.test(pathname)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <route.icon className="h-4 w-4 mr-3 shrink-0" />
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
