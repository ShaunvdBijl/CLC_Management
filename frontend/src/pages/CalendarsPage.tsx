import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/authContext';
import type { CalendarItem, PublicCampusEvent } from '../types/api';

export function CalendarsPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'campus' | 'university'>(
    user?.role === 'Unassigned' ? 'university' : 'campus',
  );

  const campusQuery = useQuery({
    queryKey: ['campus-calendar'],
    queryFn: () => apiFetch<CalendarItem[]>('/api/v1/calendar/campus'),
    enabled: mode === 'campus' && user?.role !== 'Unassigned',
  });

  const uniQuery = useQuery({
    queryKey: ['university-calendar'],
    queryFn: () => apiFetch<PublicCampusEvent[]>('/api/v1/calendar/university'),
    enabled: mode === 'university',
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendars</h1>
          <p className="text-sm text-slate-600">
            Switch between your home campus schedule (events + meetings) and the university-wide event calendar.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
          {user?.role !== 'Unassigned' && (
            <button
              onClick={() => setMode('campus')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                mode === 'campus' ? 'bg-[#DB3335] text-white' : 'text-slate-600'
              }`}
            >
              Campus Calendar
            </button>
          )}
          <button
            onClick={() => setMode('university')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              mode === 'university' ? 'bg-[#DB3335] text-white' : 'text-slate-600'
            }`}
          >
            University-Wide Calendar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {mode === 'campus'
          ? (campusQuery.data ?? []).map((item) => (
              <div key={`${item.itemType}-${item.id}`} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap justify-between gap-2">
                <div>
                  <span
                    className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                      item.itemType === 'Meeting' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {item.itemType}
                  </span>
                  <h3 className="font-semibold text-slate-900 mt-1">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.location}</p>
                  <p className="text-sm text-slate-700 mt-1">{item.description}</p>
                </div>
                <div className="text-xs font-medium text-slate-600">
                  {new Date(item.startAt).toLocaleString()} – {new Date(item.endAt).toLocaleTimeString()}
                </div>
              </div>
            ))
          : (uniQuery.data ?? []).map((ev) => (
              <div key={ev.eventId} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    {ev.campusName}
                  </span>
                  <h3 className="font-semibold text-slate-900 mt-1">{ev.title}</h3>
                  <p className="text-xs text-slate-500">{ev.venue}</p>
                  <p className="text-sm text-slate-700 mt-1">{ev.description}</p>
                </div>
                <div className="text-xs font-medium text-slate-600">
                  {new Date(ev.startAt).toLocaleString()} – {new Date(ev.endAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
