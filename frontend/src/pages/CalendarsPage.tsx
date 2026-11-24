import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/authContext';
import type { CalendarItem, PublicCampusEvent } from '../types/api';

interface UnifiedCalendarEntry {
  id: string;
  kind: 'Event' | 'Meeting';
  badge: string;
  title: string;
  description: string;
  location: string;
  startAt: Date;
  endAt: Date;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarsPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'campus' | 'university'>(
    user?.role === 'Unassigned' ? 'university' : 'campus',
  );
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  const entries: UnifiedCalendarEntry[] = useMemo(() => {
    if (mode === 'campus') {
      return (campusQuery.data ?? []).map((item) => ({
        id: `${item.itemType}-${item.id}`,
        kind: item.itemType,
        badge: item.itemType === 'Meeting' ? 'CLC Meeting' : 'Campus Event',
        title: item.title,
        description: item.description,
        location: item.location,
        startAt: new Date(item.startAt),
        endAt: new Date(item.endAt),
      }));
    }
    return (uniQuery.data ?? []).map((ev) => ({
      id: ev.eventId,
      kind: 'Event',
      badge: ev.clubName ? `${ev.campusName} · ${ev.clubName}` : ev.campusName,
      title: ev.title,
      description: ev.description,
      location: ev.venue,
      startAt: new Date(ev.startAt),
      endAt: new Date(ev.endAt),
    }));
  }, [mode, campusQuery.data, uniQuery.data]);

  // Build physical month grid cells (6 rows x 7 cols = 42 days)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const startCell = new Date(year, month, 1 - firstDayOfWeek);

    return Array.from({ length: 42 }, (_, idx) => {
      const d = new Date(startCell.getFullYear(), startCell.getMonth(), startCell.getDate() + idx);
      return {
        date: d,
        inCurrentMonth: d.getMonth() === month,
        dayEntries: entries.filter((e) => sameDay(e.startAt, d)),
      };
    });
  }, [currentMonth, entries]);

  const selectedDayEntries = useMemo(
    () => entries.filter((e) => sameDay(e.startAt, selectedDate)),
    [entries, selectedDate],
  );

  const today = new Date();
  const monthLabel = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#161616]">Calendars</h1>
          <p className="text-sm text-[#54595F]">
            Interactive monthly calendar for your campus events &amp; CLC meetings, or university-wide confirmed events.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-neutral-300 bg-white p-1">
          {user?.role !== 'Unassigned' && (
            <button
              onClick={() => setMode('campus')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mode === 'campus' ? 'bg-[#DB3335] text-white' : 'text-[#54595F] hover:text-[#161616]'
              }`}
            >
              Campus Calendar
            </button>
          )}
          <button
            onClick={() => setMode('university')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              mode === 'university' ? 'bg-[#DB3335] text-white' : 'text-[#54595F] hover:text-[#161616]'
            }`}
          >
            University-Wide Calendar
          </button>
        </div>
      </div>

      {/* Physical Month Calendar */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-[#161616] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
              }
              className="p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-extrabold min-w-[180px] text-center">
              {monthLabel}
            </h2>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
              }
              className="p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DB3335]" /> Event
            </span>
            {mode === 'campus' && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E9C00E]" /> CLC Meeting
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDate(now);
              }}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-[#E9C00E]"
            >
              Today
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-[#FAFAFA]">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-[#54595F]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 42 Day Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-200">
          {calendarDays.map((cell) => {
            const isToday = sameDay(cell.date, today);
            const isSelected = sameDay(cell.date, selectedDate);

            return (
              <button
                key={cell.date.toISOString()}
                type="button"
                onClick={() => setSelectedDate(cell.date)}
                className={`min-h-[86px] sm:min-h-[104px] p-1.5 sm:p-2 text-left align-top flex flex-col gap-1 transition-colors ${
                  !cell.inCurrentMonth ? 'bg-neutral-50/80 text-neutral-400' : 'bg-white text-[#161616]'
                } ${isSelected ? 'ring-2 ring-inset ring-[#DB3335] bg-red-50/20' : 'hover:bg-neutral-50'}`}
              >
                <span
                  className={`font-mono text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday ? 'bg-[#DB3335] text-white' : ''
                  }`}
                >
                  {cell.date.getDate()}
                </span>

                <div className="space-y-1 w-full overflow-hidden">
                  {cell.dayEntries.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        item.kind === 'Meeting'
                          ? 'bg-[#E9C00E]/25 text-[#161616]'
                          : 'bg-[#DB3335] text-white'
                      }`}
                    >
                      {item.title}
                    </div>
                  ))}
                  {cell.dayEntries.length > 2 && (
                    <p className="font-mono text-[10px] font-bold text-[#54595F] px-1">
                      +{cell.dayEntries.length - 2} more
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Schedule Panel */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-extrabold text-[#161616] uppercase tracking-wide">
          Schedule for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>
        {selectedDayEntries.length === 0 ? (
          <p className="text-sm text-[#54595F]">No events or meetings scheduled for this date.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {selectedDayEntries.map((item) => (
              <div key={item.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span
                    className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      item.kind === 'Meeting'
                        ? 'bg-[#E9C00E]/30 text-[#161616]'
                        : 'bg-[#161616] text-[#E9C00E]'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <h4 className="font-bold text-[#161616]">{item.title}</h4>
                  <p className="text-xs text-[#54595F]">{item.description}</p>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <p className="font-semibold text-[#161616] flex items-center justify-end gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#DB3335]" />
                    {item.location}
                  </p>
                  <p className="font-mono text-[#54595F] flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {item.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {item.endAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
