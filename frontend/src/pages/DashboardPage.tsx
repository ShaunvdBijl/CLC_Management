import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Calendar,
  CheckSquare,
  FileText,
  Globe,
  Shield,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isAdmin, useAuth } from '../lib/authContext';
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
    <div className="space-y-8 animate-fade-up">
      {/* Dark Command Banner */}
      <section className="relative rounded-3xl bg-[#161616] text-white p-6 sm:p-8 overflow-hidden shadow-lg">
        <div className="absolute inset-0 bc-dot-grid opacity-50" />
        <div className="bc-tricolour-bar absolute top-0 left-0 right-0" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-[#E9C00E] text-[#161616]">
                {user?.role}
              </span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white/10 text-neutral-200">
                {user?.campusName ?? 'Unassigned Campus'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.fullName ?? '...'}
            </h1>
            <p className="text-sm text-neutral-300 max-w-xl">
              {user?.role === 'Unassigned'
                ? 'Your account is awaiting campus and role assignment. Meanwhile, explore university-wide events across Pretoria, Kempton Park, and Stellenbosch.'
                : 'Coordinate proposals, publish confirmed campus events, and track departmental execution from one hub.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {isAdmin(user) && (
              <Link
                to="/admin/members"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E9C00E] hover:bg-[#d8b10b] text-[#161616] text-xs font-extrabold transition-colors"
              >
                <Shield className="w-4 h-4" />
                Manage Roles
              </Link>
            )}
            {isAssigned && (
              <Link
                to="/events"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DB3335] hover:bg-[#B52325] text-white text-xs font-extrabold transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Publish Event
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          to="/proposals"
          title="Pending Proposals"
          value={pendingProposals}
          icon={<FileText className="w-5 h-5 text-[#C9A300]" />}
          borderAccent="border-t-[#E9C00E]"
        />
        <StatCard
          to="/events"
          title="Campus Events"
          value={confirmedEvents}
          icon={<Sparkles className="w-5 h-5 text-[#DB3335]" />}
          borderAccent="border-t-[#DB3335]"
        />
        <StatCard
          to="/tasks"
          title="Open Dept Tasks"
          value={openTasks}
          icon={<CheckSquare className="w-5 h-5 text-[#2B9A9A]" />}
          borderAccent="border-t-[#4AC1C1]"
        />
        <StatCard
          to="/cross-campus"
          title="University Events"
          value={universityEvents}
          icon={<Globe className="w-5 h-5 text-[#0170B9]" />}
          borderAccent="border-t-[#0170B9]"
        />
      </div>

      {/* Dual Activity Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-[#161616] flex items-center gap-2 text-sm uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-[#DB3335]" />
              University-Wide Events
            </h2>
            <Link to="/calendar" className="text-xs font-bold text-[#DB3335] hover:underline inline-flex items-center gap-1">
              Calendar <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-neutral-100">
            {(publicEventsQuery.data ?? []).slice(0, 5).map((ev) => (
              <div key={ev.eventId} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#161616]">{ev.title}</p>
                  <p className="text-xs text-[#54595F]">
                    {ev.campusName} · {ev.venue}
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-[#54595F] shrink-0">
                  {new Date(ev.startAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {!(publicEventsQuery.data ?? []).length && (
              <p className="text-sm text-[#54595F] py-6 text-center">No confirmed events yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-[#161616] flex items-center gap-2 text-sm uppercase tracking-wide">
              <FileText className="w-4 h-4 text-[#E9C00E]" />
              Recent Proposals
            </h2>
            <Link to="/proposals" className="text-xs font-bold text-[#DB3335] hover:underline inline-flex items-center gap-1">
              Pipeline <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-neutral-100">
            {(proposalsQuery.data ?? []).slice(0, 5).map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#161616]">{p.title}</p>
                  <p className="text-xs text-[#54595F]">
                    {p.proposalType} · by {p.submittedByName}
                  </p>
                </div>
                <StatusPill status={p.status} />
              </div>
            ))}
            {!(proposalsQuery.data ?? []).length && (
              <p className="text-sm text-[#54595F] py-6 text-center">No proposals submitted yet.</p>
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
  borderAccent,
}: {
  to: string;
  title: string;
  value: number;
  icon: React.ReactNode;
  borderAccent: string;
}) {
  return (
    <Link
      to={to}
      className={`group bg-white rounded-2xl border border-neutral-200/90 border-t-4 ${borderAccent} p-5 hover:shadow-lg transition-all flex items-center justify-between`}
    >
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#54595F]">{title}</p>
        <p className="text-3xl font-extrabold text-[#161616] mt-1">{value}</p>
      </div>
      <div className="w-11 h-11 rounded-xl bg-[#F4F4F2] group-hover:scale-105 transition-transform flex items-center justify-center">
        {icon}
      </div>
    </Link>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-900',
    Approved: 'bg-emerald-100 text-emerald-900',
    ChangesRequested: 'bg-orange-100 text-orange-900',
    Rejected: 'bg-red-100 text-red-900',
  };
  return (
    <span className={`font-mono px-2.5 py-0.5 rounded-full text-[11px] font-bold ${styles[status] ?? 'bg-neutral-100 text-neutral-700'}`}>
      {status}
    </span>
  );
}
