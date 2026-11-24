import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, MessageSquare, RotateCcw, XCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isAdmin, useAuth } from '../lib/authContext';
import type { Campus, Proposal, ProposalStatus, ReviewDecision } from '../types/api';
import { StatusPill } from './DashboardPage';

const STATUS_TABS: { key: ProposalStatus | ''; label: string }[] = [
  { key: 'Pending', label: 'Pending Review' },
  { key: 'ChangesRequested', label: 'Changes Requested' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Rejected', label: 'Rejected' },
  { key: '', label: 'All' },
];

export function ProposalApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | ''>('Pending');
  const [campusFilter, setCampusFilter] = useState<string>('');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const globalAdmin = isAdmin(user);

  const campusesQuery = useQuery({
    queryKey: ['public-campuses'],
    queryFn: () => apiFetch<Campus[]>('/api/v1/campuses'),
    enabled: globalAdmin,
  });

  const proposalsQuery = useQuery({
    queryKey: ['proposal-approvals', statusFilter, campusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (globalAdmin && campusFilter) params.set('campusId', campusFilter);
      const qs = params.toString();
      return apiFetch<Proposal[]>(`/api/v1/proposals${qs ? `?${qs}` : ''}`);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: ReviewDecision; comment?: string }) =>
      apiFetch<Proposal>(`/api/v1/proposals/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment: comment || null }),
      }),
    onSuccess: (updated) => {
      setError('');
      setSuccessMsg(`Proposal "${updated.title}" marked as ${updated.status}.`);
      queryClient.invalidateQueries({ queryKey: ['proposal-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-proposals-count'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (e: Error) => {
      setSuccessMsg('');
      setError(e.message);
    },
  });

  const proposals = proposalsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#161616] flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-[#DB3335]" />
            Proposal Approvals Queue
          </h1>
          <p className="text-sm text-[#54595F]">
            {globalAdmin
              ? 'Review, approve, request changes, or reject proposals across all 3 Belgium Campus iTversity campuses.'
              : `Review and approve proposals submitted by departments at ${user?.campusName ?? 'your campus'}.`}
          </p>
        </div>

        {globalAdmin && (
          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="text-sm border border-neutral-300 rounded-xl px-3 py-2 bg-white font-semibold"
          >
            <option value="">All Campuses</option>
            {(campusesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-2xl border border-neutral-200/90 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === tab.key
                ? 'bg-[#161616] text-[#E9C00E]'
                : 'text-[#54595F] hover:text-[#161616] hover:bg-neutral-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">{error}</div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold">
          {successMsg}
        </div>
      )}

      {/* Queue List */}
      <div className="space-y-4">
        {proposals.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-neutral-200/90 p-5 space-y-4 shadow-xs"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {p.campusName && (
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#DB3335] text-white">
                      {p.campusName}
                    </span>
                  )}
                  <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#161616] text-[#E9C00E]">
                    {p.proposalType === 'Event' && p.targetClubName
                      ? `CLUB EVENT · ${p.targetClubName}`
                      : p.proposalType}
                  </span>
                  <h2 className="text-lg font-extrabold text-[#161616]">{p.title}</h2>
                </div>
                <p className="text-xs text-[#54595F]">
                  Submitted by <strong className="text-[#161616]">{p.submittedByName}</strong> ·{' '}
                  {new Date(p.createdAt).toLocaleString()}
                  {p.proposedVenue ? ` · Venue: ${p.proposedVenue}` : ''}
                  {p.proposedStartAt ? ` · Date: ${new Date(p.proposedStartAt).toLocaleString()}` : ''}
                  {p.proposedClubHeadName ? ` · Club Head: ${p.proposedClubHeadName}` : ''}
                  {p.targetEventTitle ? ` · Event: ${p.targetEventTitle}` : ''}
                </p>
              </div>
              <StatusPill status={p.status} />
            </div>

            <p className="text-sm text-[#3A3A3A] whitespace-pre-line">{p.description}</p>

            {p.proposalType === 'Club' && (p.clubWhatTheyDo || p.clubMeetingSchedule || p.clubMeetingLocation) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8F8F6] rounded-xl p-3.5 text-xs">
                <div>
                  <p className="font-bold text-[#161616]">What They Do</p>
                  <p className="text-[#54595F]">{p.clubWhatTheyDo || '—'}</p>
                </div>
                <div>
                  <p className="font-bold text-[#161616]">When Club Meets</p>
                  <p className="text-[#54595F]">{p.clubMeetingSchedule || '—'}</p>
                </div>
                <div>
                  <p className="font-bold text-[#161616]">Where Club Meets</p>
                  <p className="text-[#54595F]">{p.clubMeetingLocation || '—'}</p>
                </div>
              </div>
            )}

            {p.whatsAppMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1">
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp Promo Message
                </p>
                <p className="text-xs text-emerald-950 whitespace-pre-line">{p.whatsAppMessage}</p>
              </div>
            )}

            {p.reviews.length > 0 && (
              <div className="bg-neutral-50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-[#54595F]">Review Trail</p>
                {p.reviews.map((r) => (
                  <p key={r.id} className="text-xs text-[#3A3A3A]">
                    <span className="font-bold">{r.reviewerName}</span> ({r.decision}):{' '}
                    {r.comment || 'No comment'}
                  </p>
                ))}
              </div>
            )}

            {p.status === 'Pending' && (
              <div className="pt-3 border-t border-neutral-100 space-y-3">
                <input
                  placeholder="Review note / reason (optional for Approve, mandatory for Request Changes or Reject)"
                  value={comments[p.id] ?? ''}
                  onChange={(e) => setComments({ ...comments, [p.id]: e.target.value })}
                  className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({ id: p.id, decision: 'Approved', comment: comments[p.id] })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Proposal
                  </button>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        id: p.id,
                        decision: 'ChangesRequested',
                        comment: comments[p.id],
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Request Changes
                  </button>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({ id: p.id, decision: 'Rejected', comment: comments[p.id] })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DB3335] hover:bg-[#B52325] text-white text-xs font-bold"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Proposal
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {proposals.length === 0 && !proposalsQuery.isLoading && (
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-10 text-center space-y-1.5">
            <p className="text-sm font-bold text-[#161616]">
              No {statusFilter ? statusFilter.toLowerCase() : ''} proposals in the queue.
            </p>
            <p className="text-xs text-[#54595F]">
              When Events, Clubs, or Marketing departments submit proposals, they will appear here for review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
