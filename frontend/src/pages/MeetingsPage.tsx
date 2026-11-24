import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isLeadership, useAuth } from '../lib/authContext';
import type { Meeting } from '../types/api';

export function MeetingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [error, setError] = useState('');

  const leader = isLeadership(user);

  const meetingsQuery = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiFetch<Meeting[]>('/api/v1/meetings'),
  });

  const createMeetingMutation = useMutation({
    mutationFn: () =>
      apiFetch<Meeting>('/api/v1/meetings', {
        method: 'POST',
        body: JSON.stringify({
          title,
          agenda,
          location,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      }),
    onSuccess: () => {
      setTitle('');
      setAgenda('');
      setLocation('');
      setStartAt('');
      setEndAt('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['campus-calendar'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/meetings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['campus-calendar'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const meetings = meetingsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#161616]">Campus CLC Meetings</h1>
        <p className="text-sm text-[#54595F]">
          Official council meetings scheduled by Campus Leadership for {user?.campusName ?? 'your campus'}.
          (Individual club meeting schedules are managed under Clubs.)
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">{error}</div>
      )}

      {leader && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMeetingMutation.mutate();
          }}
          className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-4 shadow-xs"
        >
          <h2 className="font-extrabold text-[#161616] text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#DB3335]" />
            Schedule Campus CLC Meeting
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              placeholder="Meeting Title (e.g., Weekly CLC Council Sync)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <input
              required
              placeholder="Location (e.g., Boardroom 2B)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <input
              required
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <input
              required
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>
          <textarea
            required
            rows={2}
            placeholder="Meeting agenda & discussion points..."
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={createMeetingMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-[#DB3335] text-white text-sm font-bold hover:bg-[#B52325]"
          >
            {createMeetingMutation.isPending ? 'Scheduling...' : 'Schedule CLC Meeting'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {meetings.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-2xl border border-neutral-200/90 p-5 flex flex-wrap items-start justify-between gap-4 shadow-xs"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#E9C00E]/30 text-[#161616]">
                  CLC MEETING
                </span>
                <h3 className="font-extrabold text-[#161616]">{m.title}</h3>
              </div>
              <p className="text-sm text-[#3A3A3A]">{m.agenda}</p>
              <div className="flex flex-wrap gap-4 text-xs text-[#54595F] pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#DB3335]" />
                  {m.location}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#0170B9]" />
                  {new Date(m.startAt).toLocaleString()} – {new Date(m.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>Scheduled by {m.createdByName}</span>
              </div>
            </div>

            {leader && (
              <button
                type="button"
                onClick={() => deleteMeetingMutation.mutate(m.id)}
                className="p-2 rounded-lg text-neutral-400 hover:text-[#DB3335] hover:bg-red-50 transition-colors"
                title="Cancel Meeting"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {meetings.length === 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-8 text-center text-sm text-[#54595F]">
            No campus CLC meetings scheduled yet.
          </div>
        )}
      </div>
    </div>
  );
}
