import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  GanttChart,
  Globe,
  History,
  Kanban,
  LayoutDashboard,
  Menu,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isDeptHead, isLeadership, useAuth } from '../lib/authContext';
import type { NotificationFeed } from '../types/api';

export function Layout() {
  const { user, devUsers, switchDevUser, latestToast, dismissToast } = useAuth();
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
  const showMembersAdmin = user?.role === 'CampusHead';

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
    { to: '/admin/members', label: 'Member Roles', icon: Shield, show: showMembersAdmin },
  ];

  const unreadCount = notifQuery.data?.unreadCount ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            aria-label="Toggle Menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
              CLC
            </div>
            <div>
              <p className="font-semibold text-slate-900 leading-tight text-sm sm:text-base">
                CLC Operations Platform
              </p>
              <p className="text-xs text-slate-500">
                {user?.campusName ?? 'Unassigned Campus'} · {user?.role ?? 'Loading'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {devUsers.length > 0 && (
            <select
              aria-label="Switch Dev User"
              value={user?.email ?? ''}
              onChange={(e) => switchDevUser(e.target.value)}
              className="text-xs border border-amber-300 bg-amber-50 text-amber-900 rounded-lg px-2.5 py-1.5 font-medium max-w-[230px]"
            >
              {devUsers.map((u) => (
                <option key={u.id} value={u.email}>
                  [{u.campusName ?? 'None'}] {u.fullName} ({u.role})
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <button
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-sm">In-App Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifQuery.data?.items.length ? (
                    notifQuery.data.items.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                        className={`p-3 text-sm cursor-pointer hover:bg-slate-50 ${
                          n.isRead ? 'bg-white' : 'bg-indigo-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-slate-900">{n.title}</p>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-slate-500 text-center">No notifications yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={`${
            sidebarOpen ? 'block' : 'hidden'
          } lg:block w-60 bg-white border-r border-slate-200 p-3 shrink-0`}
        >
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
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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

      {latestToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-slate-900 text-white rounded-xl shadow-xl p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{latestToast.title}</p>
            <p className="text-slate-300 text-xs mt-0.5">{latestToast.message}</p>
          </div>
          <button onClick={dismissToast} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
