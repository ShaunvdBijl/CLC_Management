import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckSquare, FileText, Globe, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/authContext';
import type { CampusEvent, Proposal, PublicCampusEvent, WorkTask } from '../types/api';

export function DashboardPage() {
  const { user } = useAuth();
  const isAssigned = user && user.role !== 'Unassigned';

  const proposalsQuery = useQuery({
    queryKey: ['proposals'],
    queryFn: () => apiFetch<Proposal[]>('/api/v1/proposals'),
    enabled: !!isAssigned,
  });

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => apiFetch<CampusEvent[]>('/api/v1/events'),
    enabled: !!isAssigned,
  });

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiFetch<WorkTask[]>('/api/v1/tasks'),
    enabled: !!isAssigned,
  });

  const publicEventsQuery = useQuery({
    queryKey: ['university-calendar'],
    queryFn: () => apiFetch<PublicCampusEvent[]>('/api/v1/calendar/university'),
    enabled: !!user,
  });

  const pendingProposals = (proposalsQuery.data ?? []).filter((p) => p.status === 'Pending').length;
  const openTasks = (tasksQuery.data ?? []).filter((t) => t.status !== 'Done').length;
  const confirmedEvents = (eventsQuery.data ?? []).filter((e) => e.status === 'Confirmed').length;
  const universityEvents = (publicEventsQuery.data ?? []).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.fullName ?? '...'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {user?.role === 'Unassigned'
            ? 'Your account is awaiting campus and role assignment by a Campus Head. You can still browse university-wide events.'
            : `${user?.campusName} · ${user?.role} (${user?.department} Department)`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          to="/proposals"
          title="Pending Proposals"
          value={pendingProposals}
          icon={<FileText className="w-5 h-5 text-amber-600" />}
          accent="bg-amber-50"
        />
        <StatCard
          to="/events"
          title="Campus Events"
          value={confirmedEvents}
          icon={<Sparkles className="w-5 h-5 text-indigo-600" />}
          accent="bg-indigo-50"
        />
        <StatCard
          to="/tasks"
          title="Open Dept Tasks"
          value={openTasks}
          icon={<CheckSquare className="w-5 h-5 text-emerald-600" />}
          accent="bg-emerald-50"
        />
        <StatCard
          to="/cross-campus"
          title="University Events"
          value={universityEvents}
          icon={<Globe className="w-5 h-5 text-sky-600" />}
          accent="bg-sky-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Upcoming University-Wide Events
            </h2>
            <Link to="/calendar" className="text-xs font-medium text-indigo-600 hover:underline">
              Open Calendar
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(publicEventsQuery.data ?? []).slice(0, 5).map((ev) => (
              <div key={ev.eventId} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{ev.title}</p>
                  <p className="text-xs text-slate-500">
                    {ev.campusName} · {ev.venue}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-600 shrink-0">
                  {new Date(ev.startAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {!(publicEventsQuery.data ?? []).length && (
              <p className="text-sm text-slate-500 py-4">No confirmed events yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Recent Proposals
            </h2>
            <Link to="/proposals" className="text-xs font-medium text-indigo-600 hover:underline">
              Manage Proposals
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(proposalsQuery.data ?? []).slice(0, 5).map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{p.title}</p>
                  <p className="text-xs text-slate-500">
                    {p.proposalType} · by {p.submittedByName}
                  </p>
                </div>
                <StatusPill status={p.status} />
              </div>
            ))}
            {!(proposalsQuery.data ?? []).length && (
              <p className="text-sm text-slate-500 py-4">No proposals in your scope yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  to,
  title,
  value,
  icon,
  accent,
}: {
  to: string;
  title: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 transition-colors flex items-center gap-4"
    >
      <div className={`w-11 h-11 rounded-lg ${accent} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </Link>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Approved: 'bg-emerald-100 text-emerald-800',
    ChangesRequested: 'bg-orange-100 text-orange-800',
    Rejected: 'bg-rose-100 text-rose-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}
