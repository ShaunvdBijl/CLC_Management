import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { isLeadership, useAuth } from '../lib/authContext';
import type { CampusEvent, Club, Proposal, ProposalType, ReviewDecision, UserProfile } from '../types/api';
import { StatusPill } from './DashboardPage';

export function ProposalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});

  const defaultType: ProposalType =
    user?.department === 'Clubs' ? 'Club' : user?.department === 'Marketing' ? 'Marketing' : 'Event';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proposedVenue, setProposedVenue] = useState('');
  const [proposedStartAt, setProposedStartAt] = useState('');
  const [proposedEndAt, setProposedEndAt] = useState('');
  const [proposedClubHeadId, setProposedClubHeadId] = useState('');
  const [targetEventId, setTargetEventId] = useState('');
  const [targetClubId, setTargetClubId] = useState('');

  const canSubmit = user?.department === 'Events' || user?.department === 'Clubs' || user?.department === 'Marketing';
  const leader = isLeadership(user);

  const proposalsQuery = useQuery({
    queryKey: ['proposals', statusFilter],
    queryFn: () => apiFetch<Proposal[]>(`/api/v1/proposals${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  const usersQuery = useQuery({
    queryKey: ['campus-users'],
    queryFn: () => apiFetch<UserProfile[]>('/api/v1/users'),
    enabled: user?.department === 'Clubs' || leader,
  });

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => apiFetch<CampusEvent[]>('/api/v1/events'),
    enabled: user?.department === 'Marketing',
  });

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: () => apiFetch<Club[]>('/api/v1/clubs'),
    enabled: user?.department === 'Marketing',
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Proposal>('/api/v1/proposals', {
        method: 'POST',
        body: JSON.stringify({
          proposalType: defaultType,
          title,
          description,
          proposedStartAt: proposedStartAt ? new Date(proposedStartAt).toISOString() : null,
          proposedEndAt: proposedEndAt ? new Date(proposedEndAt).toISOString() : null,
          proposedVenue: proposedVenue || null,
          proposedClubHeadId: proposedClubHeadId || null,
          targetEventId: targetEventId || null,
          targetClubId: targetClubId || null,
        }),
      }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setProposedVenue('');
      setProposedStartAt('');
      setProposedEndAt('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: ReviewDecision; comment?: string }) =>
      apiFetch<Proposal>(`/api/v1/proposals/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment: comment || null }),
      }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const resubmitMutation = useMutation({
    mutationFn: (p: Proposal) =>
      apiFetch<Proposal>(`/api/v1/proposals/${p.id}/resubmit`, {
        method: 'PUT',
        body: JSON.stringify({
          title: p.title,
          description: `${p.description}\n[Updated and resubmitted]`,
          proposedStartAt: p.proposedStartAt,
          proposedEndAt: p.proposedEndAt,
          proposedVenue: p.proposedVenue,
          proposedClubHeadId: p.proposedClubHeadId,
          targetEventId: p.targetEventId,
          targetClubId: p.targetClubId,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] }),
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proposal Approval Pipeline</h1>
          <p className="text-sm text-slate-600">
            Structured review workflow: Pending → Approved / Changes Requested / Rejected.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="ChangesRequested">Changes Requested</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>
      )}

      {canSubmit && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Submit New {defaultType} Proposal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder="Proposal Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            {defaultType === 'Event' && (
              <input
                required
                placeholder="Proposed Venue (e.g., Main Hall)"
                value={proposedVenue}
                onChange={(e) => setProposedVenue(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            )}
            {defaultType === 'Event' && (
              <>
                <input
                  required
                  type="datetime-local"
                  value={proposedStartAt}
                  onChange={(e) => setProposedStartAt(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  required
                  type="datetime-local"
                  value={proposedEndAt}
                  onChange={(e) => setProposedEndAt(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </>
            )}
            {defaultType === 'Club' && (
              <select
                required
                value={proposedClubHeadId}
                onChange={(e) => setProposedClubHeadId(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Designated Club Head...</option>
                {(usersQuery.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            )}
            {defaultType === 'Marketing' && (
              <>
                <select
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Link to Event (optional if Club chosen)</option>
                  {(eventsQuery.data ?? []).map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
                <select
                  value={targetClubId}
                  onChange={(e) => setTargetClubId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Link to Club (optional if Event chosen)</option>
                  {(clubsQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          <textarea
            required
            rows={2}
            placeholder="Proposal description and objectives..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Submitting...' : `Submit ${defaultType} Proposal`}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {(proposalsQuery.data ?? []).map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {p.proposalType}
                  </span>
                  <h3 className="font-semibold text-slate-900">{p.title}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted by {p.submittedByName} · {new Date(p.createdAt).toLocaleString()}
                  {p.proposedVenue ? ` · Venue: ${p.proposedVenue}` : ''}
                  {p.proposedClubHeadName ? ` · Club Head: ${p.proposedClubHeadName}` : ''}
                </p>
              </div>
              <StatusPill status={p.status} />
            </div>

            <p className="text-sm text-slate-700 whitespace-pre-line">{p.description}</p>

            {p.reviews.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">Review History</p>
                {p.reviews.map((r) => (
                  <p key={r.id} className="text-xs text-slate-700">
                    <span className="font-semibold">{r.reviewerName}</span> ({r.decision}):{' '}
                    {r.comment || 'No comment'}
                  </p>
                ))}
              </div>
            )}

            {leader && p.status === 'Pending' && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <input
                  placeholder="Feedback / reason (mandatory for Changes Requested or Rejected)"
                  value={reviewComment[p.id] ?? ''}
                  onChange={(e) => setReviewComment({ ...reviewComment, [p.id]: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      reviewMutation.mutate({ id: p.id, decision: 'Approved', comment: reviewComment[p.id] })
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      reviewMutation.mutate({ id: p.id, decision: 'ChangesRequested', comment: reviewComment[p.id] })
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() =>
                      reviewMutation.mutate({ id: p.id, decision: 'Rejected', comment: reviewComment[p.id] })
                    }
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {canSubmit && p.status === 'ChangesRequested' && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => resubmitMutation.mutate(p)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  Update & Resubmit Proposal
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
