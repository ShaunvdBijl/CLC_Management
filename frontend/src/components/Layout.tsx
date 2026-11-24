import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Calendar,
  CalendarClock,
  CheckSquare,
  FileText,
  GanttChart,
  Globe,
  History,
  Home,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isDeptHead, isLeadership, useAuth } from '../lib/authContext';
import type { NotificationFeed } from '../types/api';

const BC_ICON = 'https://www.belgiumcampus.ac.za/wp-content/uploads/2021/01/BC-Icon.png';

export function Layout() {
  const { user, logout, latestToast, dismissToast } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const notifQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => apiFetch<NotificationFeed>('/api/v1/notifications'),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch('/api/v1/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const showEventsTools = isLeadership(user) || user?.department === 'Events';
  const showHistory = isLeadership(user) || isDeptHead(user);
  const showMembersAdmin = isLeadership(user);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/proposals', label: 'Proposals', icon: FileText, show: user?.role !== 'Unassigned' },
    { to: '/events', label: 'Events & Posters', icon: Sparkles, show: user?.role !== 'Unassigned' },
    { to: '/events/board', label: 'Events Kanban', icon: Kanban, show: showEventsTools },
    { to: '/events/timeline', label: 'Events Gantt', icon: GanttChart, show: showEventsTools },
    { to: '/clubs', label: 'Student Clubs', icon: Users, show: user?.role !== 'Unassigned' },
    { to: '/meetings', label: 'CLC Meetings', icon: CalendarClock, show: user?.role !== 'Unassigned' },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare, show: user?.role !== 'Unassigned' },
    { to: '/calendar', label: 'Calendars', icon: Calendar, show: true },
    { to: '/cross-campus', label: 'Cross-Campus', icon: Globe, show: true },
    { to: '/history', label: 'Activity History', icon: History, show: showHistory },
    { to: '/admin/members', label: 'Role Management', icon: Shield, show: showMembersAdmin },
  ];

  const unreadCount = notifQuery.data?.unreadCount ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F2]">
      <div className="bc-tricolour-bar sticky top-0 z-50" />

      <header className="sticky top-[3px] z-40 bg-[#141414]/95 backdrop-blur-md text-white border-b border-white/10 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-neutral-200"
            aria-label="Toggle Menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={BC_ICON}
              alt="Belgium Campus iTversity"
              className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain"
            />
            <div className="leading-none">
              <p className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                Belgium Campus <span className="text-[#DB3335]">iTversity</span>
              </p>
              <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider mt-1">
                {user?.campusName ?? 'Unassigned'} ·{' '}
                <span className="text-[#E9C00E] font-bold">{user?.role ?? '...'}</span>
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-[#E9C00E] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#E9C00E]/40 transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            Campus Showcase
          </Link>

          <div className="relative">
            <button
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-full hover:bg-white/10 text-neutral-200 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#DB3335] text-white font-mono text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-[#161616] rounded-2xl shadow-2xl border border-neutral-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-[#FAFAFA]">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-[#161616]">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-xs font-bold text-[#DB3335] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                  {notifQuery.data?.items.length ? (
                    notifQuery.data.items.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                        className={`p-3.5 text-sm cursor-pointer hover:bg-neutral-50 transition-colors ${
                          n.isRead ? 'bg-white' : 'bg-red-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-[#161616] text-xs">{n.title}</p>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#DB3335] mt-1 shrink-0" />}
                        </div>
                        <p className="text-xs text-[#54595F] mt-1 leading-relaxed">{n.message}</p>
                        <p className="font-mono text-[10px] text-neutral-400 mt-1.5">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="p-6 text-xs text-[#54595F] text-center">No notifications yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/15 hover:border-[#DB3335] hover:text-[#DB3335] text-xs font-semibold text-neutral-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={`${
            sidebarOpen ? 'block' : 'hidden'
          } lg:block w-64 bg-[#1A1A1A] text-neutral-300 border-r border-white/10 p-3.5 shrink-0`}
        >
          <div className="px-3.5 py-3 mb-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs font-extrabold text-white truncate">{user?.fullName}</p>
            <p className="font-mono text-[10px] text-neutral-400 truncate mt-0.5">{user?.email}</p>
          </div>
          <nav className="space-y-1">
            {navItems
              .filter((item) => item.show)
              .map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/events'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                      isActive
                        ? 'bg-[#DB3335] text-white shadow-md shadow-[#DB3335]/20'
                        : 'text-neutral-400 hover:bg-white/8 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
          </nav>
        </aside>

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {latestToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#161616] text-white border-l-4 border-[#E9C00E] rounded-2xl shadow-2xl p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-[#E9C00E] shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-bold text-xs">{latestToast.title}</p>
            <p className="text-neutral-300 text-xs mt-0.5 leading-relaxed">{latestToast.message}</p>
          </div>
          <button onClick={dismissToast} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
