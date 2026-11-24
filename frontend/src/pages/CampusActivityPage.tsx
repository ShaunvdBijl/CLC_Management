import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, MapPin, Search, Sparkles } from 'lucide-react';
import { apiFetch, getApiBase } from '../lib/api';
import { PublicNavbar } from '../components/PublicNavbar';
import type { Campus, PublicCampusEvent } from '../types/api';

export function CampusActivityPage() {
  const { code } = useParams<{ code: string }>();
  const [search, setSearch] = useState('');

  const campusesQuery = useQuery({
    queryKey: ['public-campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
  });

  const campuses = campusesQuery.data ?? [];
  const campus = campuses.find((c) => c.code.toLowerCase() === (code ?? '').toLowerCase());

  const eventsQuery = useQuery({
    queryKey: ['campus-public-activity', campus?.id, search],
    queryFn: () => {
      const params = new URLSearchParams({ campusId: campus!.id });
      if (search.trim()) params.set('search', search.trim());
      return apiFetch<PublicCampusEvent[]>(`/api/v1/cross-campus/events?${params}`);
    },
    enabled: !!campus?.id,
  });

  const events = eventsQuery.data ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F2]">
      <PublicNavbar />

      {/* Photographic Campus Header */}
      <section className="relative bg-[#141414] text-white overflow-hidden">
        {campus?.imageUrl && (
          <img
            src={campus.imageUrl}
            alt={campus.name}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/70 to-[#141414]/45" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-[#E9C00E] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All Campuses
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="font-mono px-2.5 py-0.5 rounded-md bg-[#DB3335] text-white text-xs font-bold">
                  {campus?.code ?? code}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-[#E9C00E] text-[#161616] text-xs font-bold">
                  {campus?.province ?? 'Belgium Campus iTversity'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                {campus?.name ?? 'Campus Activity'}
              </h1>
              {campus && (
                <>
                  <p className="text-sm text-neutral-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#E9C00E]" />
                    {campus.address}
                  </p>
                  <p className="text-sm text-neutral-300 leading-relaxed">{campus.description}</p>
                </>
              )}
            </div>

            {/* Floating Glass Campus Switcher */}
            <div className="flex flex-wrap gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 p-1.5 rounded-2xl">
              {campuses.map((c) => (
                <Link
                  key={c.id}
                  to={`/campus/${c.code}`}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    c.code === campus?.code
                      ? 'bg-[#DB3335] text-white shadow-md'
                      : 'text-neutral-200 hover:bg-white/15'
                  }`}
                >
                  <span className="font-mono opacity-80 mr-1.5">{c.code}</span>
                  {c.name.replace(' Campus', '')}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Activity Feed */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#DB3335]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#161616]">Confirmed Campus Activity</h2>
              <p className="font-mono text-[11px] text-[#54595F]">
                {events.length} PUBLIC {events.length === 1 ? 'EVENT' : 'EVENTS'} SCHEDULED
              </p>
            </div>
          </div>

          <div className="relative flex-1 max-w-sm min-w-[220px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campus events or venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 bg-[#F8F8F6] text-sm focus:outline-none focus:bg-white focus:border-[#DB3335] transition-colors"
            />
          </div>
        </div>

        {eventsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-14 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#161616] text-[#E9C00E] flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-[#161616]">
                No confirmed events for {campus?.name ?? 'this campus'} yet
              </h3>
              <p className="text-sm text-[#54595F] max-w-md mx-auto">
                Confirmed campus events and promotional posters published by the CLC Events and
                Marketing departments will appear here live.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/auth?mode=login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#DB3335] hover:bg-[#B52325] text-white text-sm font-bold transition-colors shadow-md shadow-[#DB3335]/20"
              >
                Log In to Publish Events
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => {
              const startDate = new Date(ev.startAt);
              const day = startDate.getDate().toString().padStart(2, '0');
              const month = startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();

              return (
                <article
                  key={ev.eventId}
                  className="group bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#DB3335]/60 transition-all duration-300 flex flex-col"
                >
                  <div className="relative h-48 bg-[#161616] overflow-hidden">
                    {ev.posterUrls[0] ? (
                      <img
                        src={`${getApiBase()}${ev.posterUrls[0]}`}
                        alt={ev.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bc-dot-grid flex items-end p-5 bg-gradient-to-br from-[#1E1E1E] via-[#262626] to-[#3A1617]">
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#E9C00E]">
                          {ev.campusName}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-center shadow-md min-w-[52px]">
                      <p className="font-mono text-[10px] font-bold text-[#DB3335] leading-none">
                        {month}
                      </p>
                      <p className="font-mono text-lg font-extrabold text-[#161616] leading-tight">
                        {day}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-extrabold text-[#161616] group-hover:text-[#DB3335] transition-colors">
                        {ev.title}
                      </h3>
                      <p className="text-sm text-[#54595F] line-clamp-3 leading-relaxed">
                        {ev.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-xs text-[#3A3A3A]">
                      <p className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#DB3335] shrink-0" />
                        {ev.venue}
                      </p>
                      <p className="flex items-center gap-1.5 text-[#54595F]">
                        <Clock className="w-3.5 h-3.5 text-[#0170B9] shrink-0" />
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(ev.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
