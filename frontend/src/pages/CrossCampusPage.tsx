import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, getApiBase } from '../lib/api';
import type { Campus, PublicCampusEvent } from '../types/api';

export function CrossCampusPage() {
  const [campusId, setCampusId] = useState('');
  const [search, setSearch] = useState('');

  const campusesQuery = useQuery({
    queryKey: ['campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
  });

  const eventsQuery = useQuery({
    queryKey: ['cross-campus-events', campusId, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (campusId) params.set('campusId', campusId);
      if (search.trim()) params.set('search', search.trim());
      return apiFetch<PublicCampusEvent[]>(`/api/v1/cross-campus/events?${params}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cross-Campus Activity Board</h1>
        <p className="text-sm text-slate-600">
          Confirmed public events across all campuses. Internal tasks, member assignments, and unapproved proposals remain private.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={campusId}
          onChange={(e) => setCampusId(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All Campuses</option>
          {(campusesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Search event title, venue, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white flex-1 min-w-[220px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(eventsQuery.data ?? []).map((ev) => (
          <div key={ev.eventId} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            {ev.posterUrls[0] ? (
              <img
                src={`${getApiBase()}${ev.posterUrls[0]}`}
                alt={ev.title}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="h-28 bg-gradient-to-r from-indigo-500 to-sky-500 flex items-end p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-white/90">{ev.campusName}</span>
              </div>
            )}
            <div className="p-4 space-y-2 flex-1">
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {ev.campusName}
              </span>
              <h3 className="font-semibold text-slate-900">{ev.title}</h3>
              <p className="text-xs text-slate-500">
                {ev.venue} · {new Date(ev.startAt).toLocaleString()}
              </p>
              <p className="text-sm text-slate-600">{ev.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
