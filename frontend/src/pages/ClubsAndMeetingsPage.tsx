import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { isLeadership, useAuth } from '../lib/authContext';
import type { Club, Meeting, UserProfile } from '../types/api';

export function ClubsAndMeetingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [error, setError] = useState('');

  const leader = isLeadership(user);
  const canAssignClubHead = user?.role === 'ClubsHead' || user?.role === 'CampusHead';

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: () => apiFetch<Club[]>('/api/v1/clubs'),
  });

  const meetingsQuery = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiFetch<Meeting[]>('/api/v1/meetings'),
  });

  const usersQuery = useQuery({
    queryKey: ['campus-users'],
    queryFn: () => apiFetch<UserProfile[]>('/api/v1/users'),
    enabled: canAssignClubHead,
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
    },
    onError: (e: Error) => setError(e.message),
  });

  const assignClubHeadMutation = useMutation({
    mutationFn: ({ clubId, clubHeadId }: { clubId: string; clubHeadId: string }) =>
      apiFetch(`/api/v1/clubs/${clubId}/head`, {
        method: 'PATCH',
        body: JSON.stringify({ clubHeadId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clubs'] }),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clubs & Campus Meetings</h1>
        <p className="text-sm text-slate-600">
          Registered campus clubs (created via approved Club proposals) and leadership meeting schedules.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Registered Clubs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(clubsQuery.data ?? []).map((club) => (
            <div key={club.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold text-slate-900">{club.name}</h3>
              <p className="text-sm text-slate-600">{club.description}</p>
              <p className="text-xs text-slate-500">Club Head: {club.clubHeadName}</p>
              {canAssignClubHead && (
                <select
                  value={club.clubHeadId}
                  onChange={(e) => assignClubHeadMutation.mutate({ clubId: club.id, clubHeadId: e.target.value })}
                  className="text-xs border border-slate-300 rounded-lg px-2 py-1 mt-1"
                >
                  {(usersQuery.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      Assign Head: {u.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Campus Meetings</h2>

        {leader && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMeetingMutation.mutate();
            }}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
          >
            <h3 className="font-semibold text-sm text-slate-900">Schedule New Campus Meeting</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                required
                placeholder="Meeting Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Location (e.g., Boardroom 2B)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <textarea
              required
              rows={2}
              placeholder="Meeting agenda..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#DB3335] text-white text-sm font-medium hover:bg-[#B52325]"
            >
              Schedule Meeting
            </button>
          </form>
        )}

        <div className="space-y-3">
          {(meetingsQuery.data ?? []).map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{m.title}</h3>
                <p className="text-xs text-slate-500">
                  {m.location} · Scheduled by {m.createdByName}
                </p>
                <p className="text-sm text-slate-700 mt-1">{m.agenda}</p>
              </div>
              <div className="text-xs font-medium text-slate-600">
                {new Date(m.startAt).toLocaleString()} – {new Date(m.endAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
