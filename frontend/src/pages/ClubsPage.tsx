import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, MapPin, Save, Sparkles, Users } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isLeadership, useAuth } from '../lib/authContext';
import type { Club } from '../types/api';

export function ClubsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // New Club state
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [whatTheyDo, setWhatTheyDo] = useState('');
  const [meetingSchedule, setMeetingSchedule] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [clubHeadName, setClubHeadName] = useState('');

  // Inline Club Head edit state
  const [headDrafts, setHeadDrafts] = useState<Record<string, string>>({});
  const [savedClubId, setSavedClubId] = useState<string | null>(null);

  // New Club Showcase Event state
  const [eventClubId, setEventClubId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartAt, setEventStartAt] = useState('');
  const [eventEndAt, setEventEndAt] = useState('');
  const [error, setError] = useState('');

  const canManageClubs = user?.department === 'Clubs' || isLeadership(user);

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: () => apiFetch<Club[]>('/api/v1/clubs'),
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
          clubHeadName,
        }),
      }),
    onSuccess: () => {
      setClubName('');
      setClubDesc('');
      setWhatTheyDo('');
      setMeetingSchedule('');
      setMeetingLocation('');
      setClubHeadName('');
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

  const assignClubHeadMutation = useMutation({
    mutationFn: ({ clubId, name }: { clubId: string; name: string }) =>
      apiFetch(`/api/v1/clubs/${clubId}/head`, {
        method: 'PATCH',
        body: JSON.stringify({ clubHeadName: name }),
      }),
    onSuccess: (_, { clubId }) => {
      setError('');
      setSavedClubId(clubId);
      setHeadDrafts((prev) => {
        const next = { ...prev };
        delete next[clubId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setTimeout(() => setSavedClubId((curr) => (curr === clubId ? null : curr)), 2000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const clubs = clubsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-[#161616]">Student Clubs &amp; Club Events</h1>
        <p className="text-sm text-[#54595F]">
          Register campus clubs with their meeting schedule, meeting location, activities, and Club Head (does not need to be a CLC member), and publish club showcase events.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">{error}</div>
      )}

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
                placeholder="When Club Meets (e.g., Wed 16:00)"
                value={meetingSchedule}
                onChange={(e) => setMeetingSchedule(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
              <input
                required
                placeholder="Where Club Meets (e.g., Lab B2)"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                className="border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
              />
            </div>
            <input
              required
              placeholder="Club Head Full Name (does not need to be CLC)"
              value={clubHeadName}
              onChange={(e) => setClubHeadName(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3.5 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={createClubMutation.isPending}
              className="px-4 py-2 rounded-xl bg-[#DB3335] text-white text-sm font-bold hover:bg-[#B52325]"
            >
              Register Club
            </button>
          </form>

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

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-[#161616]">Registered Clubs ({clubs.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clubs.map((club) => {
            const draftName = headDrafts[club.id] ?? club.clubHeadName;
            const dirty = draftName.trim() !== club.clubHeadName.trim() && draftName.trim().length > 0;
            const isSaved = savedClubId === club.id;

            return (
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
                    Club meets: {club.meetingSchedule || 'TBD'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#DB3335]" />
                    {club.meetingLocation || 'TBD'}
                  </span>
                </div>

                {canManageClubs && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setHeadDrafts((prev) => ({ ...prev, [club.id]: e.target.value }))}
                      placeholder="Update Club Head name..."
                      className="flex-1 text-xs border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white"
                    />
                    <button
                      type="button"
                      disabled={!dirty && !isSaved}
                      onClick={() => assignClubHeadMutation.mutate({ clubId: club.id, name: draftName })}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${
                        isSaved
                          ? 'bg-emerald-600 text-white'
                          : dirty
                            ? 'bg-[#DB3335] text-white hover:bg-[#B52325]'
                            : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      {isSaved ? 'Saved' : 'Save Head'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {clubs.length === 0 && <p className="text-sm text-[#54595F]">No clubs registered yet.</p>}
        </div>
      </section>
    </div>
  );
}
