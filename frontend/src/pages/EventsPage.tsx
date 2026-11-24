import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Upload } from 'lucide-react';
import { apiFetch, getApiBase } from '../lib/api';
import { isLeadership, useAuth } from '../lib/authContext';
import type { CampusEvent, ConflictCheckResponse, Proposal } from '../types/api';

export function EventsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [sourceProposalId, setSourceProposalId] = useState('');
  const [conflicts, setConflicts] = useState<ConflictCheckResponse | null>(null);
  const [error, setError] = useState('');

  const canCreateEvent = user?.department === 'Events' || isLeadership(user);
  const canUploadPoster = user?.department === 'Marketing';

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => apiFetch<CampusEvent[]>('/api/v1/events'),
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
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e: Error) => setError(e.message),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Campus Events & Promotional Posters</h1>
        <p className="text-sm text-slate-600">
          Publish confirmed campus events with live conflict checks and attach Marketing posters.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>
      )}

      {canCreateEvent && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <h2 className="font-semibold text-slate-900">Publish Confirmed Event</h2>
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
                }
              }}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2"
            >
              <option value="">Direct Scheduling (or pick an Approved Event Proposal)</option>
              {(approvedProposalsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  Approved Proposal: {p.title}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Event Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
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
            placeholder="Event details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />

          {conflicts?.hasConflict && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCheckConflict}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              Check Date/Venue Conflicts
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Publish Event
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(eventsQuery.data ?? []).map((ev) => (
          <div key={ev.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{ev.title}</h3>
                <p className="text-xs text-slate-500">
                  {ev.venue} · {new Date(ev.startAt).toLocaleString()} – {new Date(ev.endAt).toLocaleTimeString()}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                {ev.status}
              </span>
            </div>
            <p className="text-sm text-slate-700">{ev.description}</p>

            {ev.posters.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {ev.posters.map((poster) => (
                  <a
                    key={poster.id}
                    href={`${getApiBase()}${poster.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-24 h-24 rounded-lg overflow-hidden border border-slate-200"
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
              <label className="inline-flex items-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Upload Poster (PNG/JPG/WebP)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPosterMutation.mutate({ eventId: ev.id, file });
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
