import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ImagePlus } from 'lucide-react';
import { apiFetch, getApiBase } from '../lib/api';
import { isAdmin, isLeadership, useAuth } from '../lib/authContext';
import { FileDropZone } from '../components/FileDropZone';
import type { CampusEvent, Club, ConflictCheckResponse, Proposal } from '../types/api';

export function EventsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [sourceProposalId, setSourceProposalId] = useState('');
  const [clubId, setClubId] = useState('');
  const [posterTargetEventId, setPosterTargetEventId] = useState('');
  const [conflicts, setConflicts] = useState<ConflictCheckResponse | null>(null);
  const [error, setError] = useState('');
  const [posterSuccess, setPosterSuccess] = useState('');

  const canCreateEvent =
    user?.department === 'Events' || user?.department === 'Clubs' || isLeadership(user);
  const canUploadPoster = user?.department === 'Marketing' || isAdmin(user);

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => apiFetch<CampusEvent[]>('/api/v1/events'),
  });

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: () => apiFetch<Club[]>('/api/v1/clubs'),
    enabled: canCreateEvent,
  });

  const approvedProposalsQuery = useQuery({
    queryKey: ['approved-event-proposals'],
    queryFn: () => apiFetch<Proposal[]>('/api/v1/proposals?type=Event&status=Approved'),
    enabled: canCreateEvent,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<CampusEvent>('/api/v1/events', {
        method: 'POST',
        body: JSON.stringify({
          sourceProposalId: sourceProposalId || null,
          clubId: clubId || null,
          title,
          description,
          venue,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      }),
    onSuccess: () => {
      setTitle('');
      setVenue('');
      setDescription('');
      setStartAt('');
      setEndAt('');
      setSourceProposalId('');
      setClubId('');
      setConflicts(null);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['university-calendar'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const uploadPosterMutation = useMutation({
    mutationFn: async ({ eventId, file }: { eventId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFetch(`/api/v1/events/${eventId}/posters`, { method: 'POST', body: formData });
    },
    onSuccess: (_, vars) => {
      setError('');
      setPosterSuccess(`Uploaded "${vars.file.name}" successfully.`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e: Error) => {
      setPosterSuccess('');
      setError(e.message);
    },
  });

  const handleCheckConflict = async () => {
    if (!startAt || !endAt) return;
    try {
      const params = new URLSearchParams({
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        venue,
      });
      const res = await apiFetch<ConflictCheckResponse>(`/api/v1/events/conflicts?${params}`);
      setConflicts(res);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const events = eventsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#161616]">Campus Events & Promotional Posters</h1>
        <p className="text-sm text-[#54595F]">
          Publish campus-wide events (Events Dept) or club showcase events (Clubs Dept), and drop Marketing posters directly onto events.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">{error}</div>
      )}

      {/* Marketing Poster Drop Zone Panel */}
      {canUploadPoster && (
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-extrabold text-[#161616] text-base flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-[#DB3335]" />
              Marketing Poster Upload Drop Zone
            </h2>
            <select
              value={posterTargetEventId}
              onChange={(e) => setPosterTargetEventId(e.target.value)}
              className="text-sm border border-neutral-300 rounded-xl px-3 py-2 bg-white min-w-[240px]"
            >
              <option value="">Select Target Event for Poster...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({new Date(ev.startAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <FileDropZone
            accept="image/png,image/jpeg,image/webp"
            variant="image"
            disabled={!posterTargetEventId || uploadPosterMutation.isPending}
            title={
              posterTargetEventId
                ? 'Drop promotional poster here (PNG, JPEG, WebP)'
                : 'Select an event from the dropdown above first'
            }
            subtitle="Max 5 MB · Automatically attached to the event and shown on the public campus activity feed"
            onFileSelected={(file) => {
              if (posterTargetEventId) {
                uploadPosterMutation.mutate({ eventId: posterTargetEventId, file });
              }
            }}
          />

          {posterSuccess && (
            <p className="text-xs font-semibold text-emerald-700">{posterSuccess}</p>
          )}
        </div>
      )}

      {/* Publish Event Form */}
      {canCreateEvent && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-4 shadow-xs"
        >
          <h2 className="font-extrabold text-[#161616] text-base">Publish Confirmed Event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={sourceProposalId}
              onChange={(e) => {
                const pid = e.target.value;
                setSourceProposalId(pid);
                const found = (approvedProposalsQuery.data ?? []).find((p) => p.id === pid);
                if (found) {
                  setTitle(found.title);
                  setDescription(found.description);
                  setVenue(found.proposedVenue ?? '');
                  if (found.targetClubId) setClubId(found.targetClubId);
                }
              }}
              className="border border-neutral-300 rounded-xl px-3 py-2.5 text-sm bg-white"
            >
              <option value="">Direct Scheduling (or pick an Approved Proposal)</option>
              {(approvedProposalsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  Approved: {p.title}
                </option>
              ))}
            </select>

            <select
              required={user?.department === 'Clubs' && !isLeadership(user)}
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3 py-2.5 text-sm bg-white"
            >
              <option value="">Scope: Campus-Wide Event (Events Dept)</option>
              {(clubsQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  Club Event: {c.name}
                </option>
              ))}
            </select>

            <input
              required
              placeholder="Event Title (e.g., Campus Quiz Night)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <input
              required
              placeholder="Venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
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
            placeholder="Event details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
          />

          {conflicts?.hasConflict && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Scheduling Conflict Detected
              </p>
              {conflicts.conflicts.map((c) => (
                <p key={c.eventId}>
                  • <strong>{c.title}</strong> at {c.venue} ({new Date(c.startAt).toLocaleString()} –{' '}
                  {new Date(c.endAt).toLocaleTimeString()}) [{c.conflictType}]
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCheckConflict}
              className="px-4 py-2 rounded-xl border border-neutral-300 text-[#161616] text-sm font-semibold hover:bg-neutral-50"
            >
              Check Date/Venue Conflicts
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#DB3335] text-white text-sm font-bold hover:bg-[#B52325]"
            >
              Publish Event
            </button>
          </div>
        </form>
      )}

      {/* Event Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.map((ev) => (
          <div key={ev.id} className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#161616] text-[#E9C00E]">
                    {ev.clubName ? `CLUB · ${ev.clubName}` : 'CAMPUS-WIDE'}
                  </span>
                </div>
                <h3 className="font-extrabold text-[#161616]">{ev.title}</h3>
                <p className="text-xs text-[#54595F]">
                  {ev.venue} · {new Date(ev.startAt).toLocaleString()} – {new Date(ev.endAt).toLocaleTimeString()}
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {ev.status}
              </span>
            </div>
            <p className="text-sm text-[#3A3A3A]">{ev.description}</p>

            {ev.posters.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {ev.posters.map((poster) => (
                  <a
                    key={poster.id}
                    href={`${getApiBase()}${poster.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-24 h-24 rounded-xl overflow-hidden border border-neutral-200 hover:border-[#DB3335]"
                  >
                    <img
                      src={`${getApiBase()}${poster.url}`}
                      alt={poster.fileName}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}

            {canUploadPoster && (
              <div className="pt-2">
                <FileDropZone
                  accept="image/png,image/jpeg,image/webp"
                  variant="image"
                  title="Drop poster for this event"
                  subtitle="PNG, JPEG, or WebP (max 5 MB)"
                  onFileSelected={(file) => uploadPosterMutation.mutate({ eventId: ev.id, file })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
