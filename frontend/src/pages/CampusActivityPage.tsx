import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, MapPin, Sparkles } from 'lucide-react';
import { apiFetch, getApiBase } from '../lib/api';
import { PublicNavbar } from '../components/PublicNavbar';
import type { Campus, PublicCampusEvent } from '../types/api';

export function CampusActivityPage() {
  const { code } = useParams<{ code: string }>();

  const campusesQuery = useQuery({
    queryKey: ['public-campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
  });

  const campuses = campusesQuery.data ?? [];
  const campus = campuses.find((c) => c.code.toLowerCase() === (code ?? '').toLowerCase());

  const eventsQuery = useQuery({
    queryKey: ['campus-public-activity', campus?.id],
    queryFn: () => apiFetch<PublicCampusEvent[]>(`/api/v1/cross-campus/events?campusId=${campus!.id}`),
    enabled: !!campus?.id,
  });

  const events = eventsQuery.data ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <PublicNavbar />

      {/* Campus Hero Banner */}
      <section className="relative bg-[#1E1E1E] text-white">
        {campus?.imageUrl && (
          <img
            src={campus.imageUrl}
            alt={campus.name}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1E] via-[#1E1E1E]/75 to-[#1E1E1E]/60" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-[#E9C00E] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Campuses
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded bg-[#DB3335] text-white text-xs font-bold">
                  {campus?.code ?? code}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-[#E9C00E] text-[#1E1E1E] text-xs font-bold">
                  {campus?.province ?? 'Belgium Campus iTversity'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold">{campus?.name ?? 'Campus Activity'}</h1>
              {campus && (
                <p className="text-sm text-neutral-300 mt-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#E9C00E]" />
                  {campus.address}
                </p>
              )}
            </div>

            {/* Quick campus switcher */}
            <div className="flex flex-wrap gap-2">
              {campuses.map((c) => (
                <Link
                  key={c.id}
                  to={`/campus/${c.code}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    c.code === campus?.code
                      ? 'bg-[#DB3335] text-white'
                      : 'bg-white/10 hover:bg-white/20 text-neutral-200'
                  }`}
                >
                  {c.name.replace(' Campus', '')}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Activity Feed */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1E1E1E] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#DB3335]" />
            Confirmed Campus Activity
          </h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-neutral-200 text-[#54595F]">
            {events.length} {events.length === 1 ? 'Event' : 'Events'}
          </span>
        </div>

        {eventsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-[#DB3335] mx-auto opacity-80" />
            <h3 className="text-lg font-bold text-[#1E1E1E]">
              No confirmed events published for {campus?.name ?? 'this campus'} yet
            </h3>
            <p className="text-sm text-[#54595F] max-w-md mx-auto">
              Once the Events department or Campus Leadership confirms upcoming events for this campus,
              they will appear here automatically.
            </p>
            <div className="pt-2">
              <Link
                to="/auth?mode=login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DB3335] hover:bg-[#B52325] text-white text-sm font-semibold"
              >
                Log In to Manage Events
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => (
              <article
                key={ev.eventId}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
              >
                {ev.posterUrls[0] ? (
                  <img
                    src={`${getApiBase()}${ev.posterUrls[0]}`}
                    alt={ev.title}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="h-32 bg-[#1E1E1E] relative flex items-end p-4">
                    <div className="bc-tricolour-bar absolute top-0 left-0 right-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E9C00E]">
                      {ev.campusName}
                    </span>
                  </div>
                )}
                <div className="p-5 space-y-2.5 flex-1">
                  <h3 className="text-lg font-bold text-[#1E1E1E]">{ev.title}</h3>
                  <div className="space-y-1 text-xs text-[#54595F]">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#DB3335]" />
                      {ev.venue}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0170B9]" />
                      {new Date(ev.startAt).toLocaleString()} – {new Date(ev.endAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="text-sm text-[#3A3A3A] pt-1">{ev.description}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
