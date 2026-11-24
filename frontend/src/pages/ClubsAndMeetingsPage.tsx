import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, Sparkles, Users } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isLeadership, useAuth } from '../lib/authContext';
import type { Club, Meeting, UserProfile } from '../types/api';

export function ClubsAndMeetingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // New Club state
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [whatTheyDo, setWhatTheyDo] = useState('');
  const [meetingSchedule, setMeetingSchedule] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [clubHeadId, setClubHeadId] = useState('');

  // New Club Event state
  const [eventClubId, setEventClubId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartAt, setEventStartAt] = useState('');
  const [eventEndAt, setEventEndAt] = useState('');

  // Campus Meeting state
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [error, setError] = useState('');

  const leader = isLeadership(user);
  const canManageClubs = user?.department === 'Clubs' || leader;

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
    enabled: canManageClubs,
  });

  const createClubMutation = useMutation({
    mutationFn: () =>
      apiFetch<Club>('/api/v1/clubs', {
        method: 'POST',
        body: JSON.stringify({
          name: clubName,
          description: clubDesc,
          whatTheyDo,
          meetingSchedule,
          meetingLocation,
          clubHeadId,
        }),
      }),
    onSuccess: () => {
      setClubName('');
      setClubDesc('');
      setWhatTheyDo('');
      setMeetingSchedule('');
      setMeetingLocation('');
      setClubHeadId('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const createClubEventMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/events', {
        method: 'POST',
        body: JSON.stringify({
          sourceProposalId: null,
          clubId: eventClubId,
          title: eventTitle,
          description: eventDesc,
          venue: eventVenue,
          startAt: new Date(eventStartAt).toISOString(),
          endAt: new Date(eventEndAt).toISOString(),
        }),
      }),
    onSuccess: () => {
      setEventClubId('');
      setEventTitle('');
      setEventVenue('');
      setEventDesc('');
      setEventStartAt('');
      setEventEndAt('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['university-calendar'] });
    },
    onError: (e: Error) => setError(e.message),
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

  const clubs = clubsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-[#161616]">Clubs, Club Showcases & Campus Meetings</h1>
        <p className="text-sm text-[#54595F]">
          Register campus clubs with full meeting & activity details, schedule club showcase events, and manage leadership meetings.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">{error}</div>
      )}

      {/* Register Club Form */}
      {canManageClubs && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createClubMutation.mutate();
            }}
            className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-3 shadow-xs"
          >
            <h2 className="font-extrabold text-[#161616] text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-[#DB3335]" />
              Register New Campus Club
            </h2>
            <input
              required
              placeholder="Club Name (e.g., Robotics Club)"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
            />
            <textarea
              required
              rows={2}
              placeholder="Club description..."
              value={clubDesc}
              onChange={(e) => setClubDesc(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
            />
            <input
              required
              placeholder="What They Do (e.g., Build autonomous robots & embedded systems)"
              value={whatTheyDo}
              onChange={(e) => setWhatTheyDo(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                required
                placeholder="When They Meet (e.g., Wed 16:00)"
                value={meetingSchedule}
                onChange={(e) => setMeetingSchedule(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
              <input
                required
                placeholder="Where They Meet (e.g., Lab B2)"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
            </div>
            <select
              required
              value={clubHeadId}
              onChange={(e) => setClubHeadId(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm bg-white"
            >
              <option value="">Assign Club Head...</option>
              {(usersQuery.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={createClubMutation.isPending}
              className="px-4 py-2 rounded-xl bg-[#DB3335] text-white text-sm font-bold hover:bg-[#B52325]"
            >
              Register Club
            </button>
          </form>

          {/* Create Club Event Showcase Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createClubEventMutation.mutate();
            }}
            className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-3 shadow-xs"
          >
            <h2 className="font-extrabold text-[#161616] text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E9C00E]" />
              Schedule Club Event / Showcase
            </h2>
            <select
              required
              value={eventClubId}
              onChange={(e) => setEventClubId(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm bg-white"
            >
              <option value="">Select Club Hosting the Event...</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Event Title (e.g., Robotics Club Project Showcase)"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
            />
            <input
              required
              placeholder="Venue (e.g., Innovation Hall)"
              value={eventVenue}
              onChange={(e) => setEventVenue(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                required
                type="datetime-local"
                value={eventStartAt}
                onChange={(e) => setEventStartAt(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
              <input
                required
                type="datetime-local"
                value={eventEndAt}
                onChange={(e) => setEventEndAt(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
            </div>
            <textarea
              required
              rows={2}
              placeholder="What the club will showcase or host..."
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={createClubEventMutation.isPending || clubs.length === 0}
              className="px-4 py-2 rounded-xl bg-[#161616] text-[#E9C00E] text-sm font-bold hover:bg-[#2B2B2B] disabled:opacity-50"
            >
              Publish Club Event
            </button>
          </form>
        </div>
      )}

      {/* Registered Clubs Directory */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-[#161616]">Registered Clubs ({clubs.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clubs.map((club) => (
            <div key={club.id} className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-extrabold text-base text-[#161616]">{club.name}</h3>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#161616] text-[#E9C00E]">
                  HEAD: {club.clubHeadName}
                </span>
              </div>
              <p className="text-sm text-[#3A3A3A]">{club.description}</p>
              {club.whatTheyDo && (
                <p className="text-xs text-[#54595F]">
                  <strong className="text-[#161616]">What they do:</strong> {club.whatTheyDo}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-100 text-xs text-[#54595F]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#0170B9]" />
                  {club.meetingSchedule || 'Schedule TBD'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#DB3335]" />
                  {club.meetingLocation || 'Location TBD'}
                </span>
              </div>
              {canManageClubs && (
                <select
                  value={club.clubHeadId}
                  onChange={(e) => assignClubHeadMutation.mutate({ clubId: club.id, clubHeadId: e.target.value })}
                  className="text-xs border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white"
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
          {clubs.length === 0 && (
            <p className="text-sm text-[#54595F]">No clubs registered yet.</p>
          )}
        </div>
      </section>

      {/* Campus Meetings Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-extrabold text-[#161616] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#DB3335]" />
          Campus Leadership Meetings
        </h2>

        {leader && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMeetingMutation.mutate();
            }}
            className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-3 shadow-xs"
          >
            <h3 className="font-bold text-sm text-[#161616]">Schedule New Campus Meeting</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                required
                placeholder="Meeting Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
              <input
                required
                placeholder="Location (e.g., Boardroom 2B)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
              <input
                required
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
              <input
                required
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
            </div>
            <textarea
              required
              rows={2}
              placeholder="Meeting agenda..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#DB3335] text-white text-sm font-bold hover:bg-[#B52325]"
            >
              Schedule Meeting
            </button>
          </form>
        )}

        <div className="space-y-3">
          {(meetingsQuery.data ?? []).map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-neutral-200/90 p-4 flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-bold text-[#161616]">{m.title}</h3>
                <p className="text-xs text-[#54595F]">
                  {m.location} · Scheduled by {m.createdByName}
                </p>
                <p className="text-sm text-[#3A3A3A] mt-1">{m.agenda}</p>
              </div>
              <div className="font-mono text-xs font-medium text-[#54595F]">
                {new Date(m.startAt).toLocaleString()} – {new Date(m.endAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
