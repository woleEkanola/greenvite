'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Calendar,
  Smartphone,
  Users,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

interface SidebarProps {
  groups: NavGroup[]
  singleItems?: NavItem[]
  isEventSidebar?: boolean
  eventTitle?: string
  onBack?: () => void
}

export function Sidebar({ groups, singleItems = [], isEventSidebar, eventTitle, onBack }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    () => new Set(isEventSidebar ? ['invitations'] : [])
  )
  const [isDark, setIsDark] = React.useState(false)

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard'
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const toggleGroup = (label: string) => {
    if (collapsed) return
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label.toLowerCase())) {
        next.delete(label.toLowerCase())
      } else {
        next.add(label.toLowerCase())
      }
      return next
    })
  }

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return
    await signOut({ redirect: false })
    router.push('/login')
  }

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark(!isDark)
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }

  React.useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      setIsDark(true)
    }
  }, [])

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="h-7 w-7 rounded-md bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
            Greenvites
          </span>
        )}
      </div>

      {/* User */}
      {!collapsed && session?.user && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {session.user.name || session.user.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {session.user.role?.toLowerCase() || 'admin'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Event header (for event sidebar) */}
      {isEventSidebar && eventTitle && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center text-emerald-600 hover:text-emerald-700 text-sm mb-2 transition-colors dark:text-emerald-400"
            >
              <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
              Back to Events
            </button>
          )}
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {eventTitle}
          </h2>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {/* Single items */}
        {singleItems.map(item => (
          <TooltipProvider key={item.href} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150',
                    isActive(item.href)
                      ? 'bg-emerald-500 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  )}
                >
                  <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {item.badge && !collapsed && (
                    <span className="ml-auto text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ))}

        {/* Grouped items */}
        {groups.map(group => {
          const groupKey = group.label.toLowerCase()
          const isExpanded = expandedGroups.has(groupKey)

          return (
            <div key={group.label} className="space-y-0.5">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-400"
                >
                  {group.label}
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
              {(isExpanded || collapsed) && group.items.map(item => (
                <TooltipProvider key={item.href} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150',
                          collapsed ? 'justify-center' : '',
                          isActive(item.href)
                            ? 'bg-emerald-500 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                          !collapsed && 'pl-12'
                        )}
                      >
                        <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2 flex-shrink-0 space-y-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleDark}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {isDark ? (
                  <Sun className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <Moon className="h-4 w-4 flex-shrink-0" />
                )}
                {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">{isDark ? 'Light Mode' : 'Dark Mode'}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>Sign out</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Sign out</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 transition-colors dark:hover:bg-gray-800"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4 rotate-180" />
          )}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-md bg-white shadow-card text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-400"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300 ease-spring dark:bg-gray-950 dark:border-gray-800',
          collapsed ? 'w-16' : 'w-64',
          'hidden lg:flex'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white z-50 flex flex-col transition-transform duration-300 ease-spring dark:bg-gray-950',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:hidden'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
