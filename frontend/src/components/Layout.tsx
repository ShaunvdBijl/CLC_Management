import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Calendar,
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
import { isAdmin, isDeptHead, isLeadership, useAuth } from '../lib/authContext';
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
  const showMembersAdmin = isAdmin(user) || user?.role === 'CampusHead';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/proposals', label: 'Proposals', icon: FileText, show: user?.role !== 'Unassigned' },
    { to: '/events', label: 'Events & Posters', icon: Sparkles, show: user?.role !== 'Unassigned' },
    { to: '/events/board', label: 'Events Kanban', icon: Kanban, show: showEventsTools },
    { to: '/events/timeline', label: 'Events Gantt', icon: GanttChart, show: showEventsTools },
    { to: '/clubs', label: 'Clubs & Meetings', icon: Users, show: user?.role !== 'Unassigned' },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare, show: user?.role !== 'Unassigned' },
    { to: '/calendar', label: 'Calendars', icon: Calendar, show: true },
    { to: '/cross-campus', label: 'Cross-Campus', icon: Globe, show: true },
    { to: '/history', label: 'Activity History', icon: History, show: showHistory },
    { to: '/admin/members', label: 'Role Management', icon: Shield, show: showMembersAdmin },
  ];

  const unreadCount = notifQuery.data?.unreadCount ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <div className="bc-tricolour-bar sticky top-0 z-40" />

      {/* Top Bar */}
      <header className="sticky top-[4px] z-30 bg-[#1E1E1E] text-white border-b border-neutral-800 px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-neutral-800 text-neutral-200"
            aria-label="Toggle Menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={BC_ICON}
              alt="Belgium Campus iTversity"
              className="w-8 h-8 rounded bg-white p-0.5 object-contain"
            />
            <div>
              <p className="font-bold text-white leading-tight text-sm sm:text-base">
                Belgium Campus <span className="text-[#DB3335]">iTversity</span>
              </p>
              <p className="text-[11px] text-neutral-400">
                {user?.campusName ?? 'Unassigned Campus'} ·{' '}
                <span className="text-[#E9C00E] font-semibold">{user?.role ?? 'Loading'}</span>
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-[#E9C00E] px-2.5 py-1.5 rounded-lg hover:bg-neutral-800"
          >
            <Home className="w-3.5 h-3.5" />
            Campus Showcase
          </Link>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-lg hover:bg-neutral-800 text-neutral-200"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#DB3335] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-[#1E1E1E] rounded-xl shadow-xl border border-neutral-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                  <span className="font-bold text-sm">In-App Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-xs font-semibold text-[#DB3335] hover:underline"
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
                        className={`p-3 text-sm cursor-pointer hover:bg-neutral-50 ${
                          n.isRead ? 'bg-white' : 'bg-red-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-[#1E1E1E]">{n.title}</p>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#DB3335] mt-1.5 shrink-0" />}
                        </div>
                        <p className="text-xs text-[#54595F] mt-0.5">{n.message}</p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-[#54595F] text-center">No notifications yet.</p>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-600 hover:border-[#DB3335] hover:text-[#DB3335] text-xs font-semibold text-neutral-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1">
        <aside
          className={`${
            sidebarOpen ? 'block' : 'hidden'
          } lg:block w-64 bg-[#242424] text-neutral-200 border-r border-neutral-800 p-3 shrink-0`}
        >
          <div className="px-3 py-2.5 mb-2 rounded-lg bg-[#1E1E1E] border border-neutral-800">
            <p className="text-xs font-bold text-white truncate">{user?.fullName}</p>
            <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
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
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#DB3335] text-white shadow-xs'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Live SignalR Toast */}
      {latestToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-[#1E1E1E] text-white border-l-4 border-[#E9C00E] rounded-xl shadow-2xl p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-[#E9C00E] shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-bold">{latestToast.title}</p>
            <p className="text-neutral-300 text-xs mt-0.5">{latestToast.message}</p>
          </div>
          <button onClick={dismissToast} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
