'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Calendar,
  Mail,
  Ticket
} from 'lucide-react';
import Image from 'next/image';

interface SidebarItem {
  name: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  items: SidebarItem[];
}

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard':
        return <LayoutDashboard className="h-5 w-5" />;
      case 'users':
        return <Users className="h-5 w-5" />;
      case 'settings':
        return <Settings className="h-5 w-5" />;
      case 'calendar':
        return <Calendar className="h-5 w-5" />;
      case 'mail':
        return <Mail className="h-5 w-5" />;
      case 'ticket':
        return <Ticket className="h-5 w-5" />;
      default:
        return <LayoutDashboard className="h-5 w-5" />;
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile sidebar toggle */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-green-600 text-white md:hidden"
        onClick={toggleMobileSidebar}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleMobileSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'} 
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Image
              src="/greenvites.png"
              alt="Greenvites Logo"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            {!isCollapsed && (
              <span className="text-xl font-medium bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Greenvites
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 hidden md:block"
          >
            {isCollapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Sidebar content */}
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="px-2 space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {getIcon(item.icon)}
                  </div>
                  {!isCollapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar footer */}
        <div className="p-4 border-t">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                {session?.user?.name?.[0] || session?.user?.id?.[0] || 'U'}
              </div>
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {session?.user?.name || session?.user?.id || 'User'}
                </p>
                <p className="text-xs text-gray-500">{session?.user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`mt-4 flex items-center justify-center w-full px-3 py-2 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition-colors duration-200 ${
              isCollapsed ? 'p-2' : ''
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
