import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Calendar,
  Clock,
  Lock,
  LogIn,
  MapPin,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { PublicNavbar } from '../components/PublicNavbar';
import type { Campus, PublicCampusEvent } from '../types/api';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');

  const campusesQuery = useQuery({
    queryKey: ['public-campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
  });

  const eventsQuery = useQuery({
    queryKey: ['landing-university-events', selectedCampusId],
    queryFn: () => {
      const params = selectedCampusId ? `?campusId=${selectedCampusId}` : '';
      return apiFetch<PublicCampusEvent[]>(`/api/v1/cross-campus/events${params}`);
    },
  });

  const campuses = campusesQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const totalLiveEvents = campuses.reduce((sum, c) => sum + c.confirmedEventCount, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F2]">
      <PublicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full space-y-10">
        {/* Compact Operational Header (No Ad/Marketing Fluff) */}
        <section className="bg-[#161616] text-white rounded-2xl p-6 sm:p-7 border border-white/10 shadow-md relative overflow-hidden">
          <div className="bc-tricolour-bar absolute top-0 left-0 right-0" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E9C00E]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-300">
                  Belgium Campus iTversity · CLC Operations
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Campus Activity &amp; Council Workspace
              </h1>
              <p className="text-sm text-neutral-300 max-w-2xl">
                Select a campus below to view confirmed campus activity, or sign in to manage
                proposals, departmental tasks, clubs, meetings, Kanban/Gantt schedules, and member roles.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right pr-3 border-r border-white/15">
                <p className="font-mono text-xl font-extrabold text-[#E9C00E] leading-none">
                  {totalLiveEvents}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mt-1">
                  Confirmed Events
                </p>
              </div>
              <Link
                to={isAuthenticated ? '/dashboard' : '/auth?mode=login'}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DB3335] hover:bg-[#B52325] text-white text-xs sm:text-sm font-bold transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {isAuthenticated ? 'Open CLC Portal' : 'CLC Member Sign In'}
              </Link>
            </div>
          </div>
        </section>

        {/* 3 Campuses — Front & Center */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-[#161616]">
                Campuses ({campuses.length || 3})
              </h2>
              <p className="text-xs text-[#54595F]">
                Click a campus to open its dedicated activity feed.
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#54595F]">
              PTA · KMP · STB
            </span>
          </div>

          {campusesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-72 rounded-2xl bg-neutral-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {campuses.map((campus) => (
                <Link
                  key={campus.id}
                  to={`/campus/${campus.code}`}
                  className="group relative h-72 rounded-2xl overflow-hidden bg-[#161616] border border-neutral-200 shadow-sm hover:shadow-xl hover:border-[#DB3335] transition-all duration-300 flex flex-col justify-between"
                >
                  <img
                    src={campus.imageUrl}
                    alt={campus.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/45 to-black/15" />

                  <div className="relative p-4 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-[#161616]/90 text-[#E9C00E] border border-white/15">
                      {campus.code}
                    </span>
                    <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#DB3335] text-white">
                      {campus.confirmedEventCount}{' '}
                      {campus.confirmedEventCount === 1 ? 'Event' : 'Events'}
                    </span>
                  </div>

                  <div className="relative p-5 space-y-1.5">
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <h3 className="text-xl font-extrabold text-white group-hover:text-[#E9C00E] transition-colors">
                          {campus.name}
                        </h3>
                        <p className="text-xs text-neutral-300 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#DB3335] shrink-0" />
                          {campus.address}
                        </p>
                      </div>
                      <span className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm text-white group-hover:bg-[#DB3335] flex items-center justify-center shrink-0 transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Live University-Wide Confirmed Schedule */}
        <section className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA]">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#DB3335]" />
              <div>
                <h2 className="text-sm font-extrabold text-[#161616] uppercase tracking-wide">
                  University-Wide Confirmed Activity
                </h2>
                <p className="text-xs text-[#54595F]">
                  Public events confirmed by CLC across all campuses
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCampusId('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedCampusId === ''
                    ? 'bg-[#161616] text-white'
                    : 'bg-white border border-neutral-200 text-[#54595F] hover:text-[#161616]'
                }`}
              >
                All Campuses
              </button>
              {campuses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCampusId(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    selectedCampusId === c.id
                      ? 'bg-[#DB3335] text-white'
                      : 'bg-white border border-neutral-200 text-[#54595F] hover:text-[#161616]'
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          {events.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-bold text-[#161616]">
                No confirmed events published yet.
              </p>
              <p className="text-xs text-[#54595F]">
                Events published inside the CLC Portal by Events Heads or Campus Leadership appear here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {events.map((ev) => (
                <div
                  key={ev.eventId}
                  className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#161616] text-[#E9C00E]">
                        {ev.campusName}
                      </span>
                      <h3 className="text-sm font-bold text-[#161616]">{ev.title}</h3>
                    </div>
                    <p className="text-xs text-[#54595F]">{ev.description}</p>
                  </div>
                  <div className="text-right space-y-0.5 text-xs">
                    <p className="font-semibold text-[#161616] flex items-center justify-end gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#DB3335]" />
                      {ev.venue}
                    </p>
                    <p className="font-mono text-[11px] text-[#54595F] flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ev.startAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Internal Duties Notice */}
          <div className="px-5 py-3 bg-[#F8F8F6] border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-[#54595F]">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#DB3335]" />
              Internal proposals, departmental tasks, Kanban/Gantt boards, clubs, and role management require CLC sign-in.
            </span>
            <Link
              to={isAuthenticated ? '/dashboard' : '/auth?mode=login'}
              className="font-bold text-[#DB3335] hover:underline"
            >
              {isAuthenticated ? 'Go to Dashboard →' : 'Log In / Sign Up →'}
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#141414] text-neutral-400 text-xs py-5 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <p>Belgium Campus iTversity — Campus Leadership Council Operations Platform</p>
          <p className="font-mono text-[11px] text-neutral-500">PTA · KMP · STB</p>
        </div>
      </footer>
    </div>
  );
}
