import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { CampusEvent } from '../types/api';

export function EventsGanttPage() {
  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => apiFetch<CampusEvent[]>('/api/v1/events'),
  });

  const events = (eventsQuery.data ?? []).filter((e) => e.status === 'Confirmed');

  const hasConflict = (ev: CampusEvent) =>
    events.some(
      (other) =>
        other.id !== ev.id &&
        new Date(other.startAt) < new Date(ev.endAt) &&
        new Date(other.endAt) > new Date(ev.startAt),
    );

  const minTime = events.length ? Math.min(...events.map((e) => new Date(e.startAt).getTime())) : Date.now();
  const maxTime = events.length
    ? Math.max(...events.map((e) => new Date(e.endAt).getTime()))
    : Date.now() + 86400000;
  const totalSpan = Math.max(maxTime - minTime, 86400000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Events Gantt Timeline & Conflict Detector</h1>
        <p className="text-sm text-slate-600">
          Visualize upcoming campus events across time and spot overlapping dates or venues immediately.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 overflow-x-auto">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No confirmed events scheduled.</p>
        ) : (
          <div className="min-w-[640px] space-y-3">
            <div className="flex justify-between text-xs font-medium text-slate-500 pb-2 border-b border-slate-200">
              <span>{new Date(minTime).toLocaleDateString()}</span>
              <span>Timeline Span</span>
              <span>{new Date(maxTime).toLocaleDateString()}</span>
            </div>

            {events.map((ev) => {
              const startMs = new Date(ev.startAt).getTime();
              const endMs = new Date(ev.endAt).getTime();
              const leftPct = ((startMs - minTime) / totalSpan) * 100;
              const widthPct = Math.max(((endMs - startMs) / totalSpan) * 100, 6);
              const conflicted = hasConflict(ev);

              return (
                <div key={ev.id} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 pr-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{ev.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {ev.venue} · {new Date(ev.startAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-span-8 relative h-9 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      style={{ left: `${leftPct}%`, width: `${Math.min(widthPct, 100 - leftPct)}%` }}
                      className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center gap-1 text-xs font-semibold text-white truncate ${
                        conflicted ? 'bg-rose-600' : 'bg-[#DB3335]'
                      }`}
                    >
                      {conflicted && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{ev.title}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
