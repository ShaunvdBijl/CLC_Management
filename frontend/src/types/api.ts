export type UserRole =
  | 'Unassigned'
  | 'CampusHead'
  | 'Deputy'
  | 'EventsHead'
  | 'ClubsHead'
  | 'MarketingHead'
  | 'DepartmentMember';

export type Department = 'None' | 'Events' | 'Clubs' | 'Marketing';
export type ProposalType = 'Event' | 'Club' | 'Marketing';
export type ProposalStatus = 'Pending' | 'Approved' | 'ChangesRequested' | 'Rejected';
export type ReviewDecision = 'Approved' | 'ChangesRequested' | 'Rejected';
export type WorkTaskStatus = 'ToDo' | 'InProgress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Campus {
  id: string;
  name: string;
  code: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  campusId: string | null;
  campusName: string | null;
  role: UserRole;
  department: Department;
  isActive: boolean;
}

export interface ProposalReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  decision: ReviewDecision;
  comment: string | null;
  reviewedAt: string;
}

export interface Proposal {
  id: string;
  campusId: string;
  submittedById: string;
  submittedByName: string;
  proposalType: ProposalType;
  status: ProposalStatus;
  title: string;
  description: string;
  proposedStartAt: string | null;
  proposedEndAt: string | null;
  proposedVenue: string | null;
  proposedClubHeadId: string | null;
  proposedClubHeadName: string | null;
  targetEventId: string | null;
  targetClubId: string | null;
  createdAt: string;
  updatedAt: string;
  reviews: ProposalReview[];
}

export interface EventPoster {
  id: string;
  fileName: string;
  url: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface CampusEvent {
  id: string;
  campusId: string;
  campusName: string;
  sourceProposalId: string | null;
  title: string;
  description: string;
  venue: string;
  startAt: string;
  endAt: string;
  status: 'Confirmed' | 'Cancelled';
  posters: EventPoster[];
}

export interface PublicCampusEvent {
  eventId: string;
  campusId: string;
  campusName: string;
  title: string;
  description: string;
  venue: string;
  startAt: string;
  endAt: string;
  posterUrls: string[];
}

export interface ConflictCheckResponse {
  hasConflict: boolean;
  conflicts: {
    eventId: string;
    title: string;
    venue: string;
    startAt: string;
    endAt: string;
    conflictType: string;
  }[];
}

export interface Club {
  id: string;
  campusId: string;
  name: string;
  description: string;
  clubHeadId: string;
  clubHeadName: string;
  isActive: boolean;
  createdAt: string;
}

export interface Meeting {
  id: string;
  campusId: string;
  title: string;
  agenda: string;
  location: string;
  startAt: string;
  endAt: string;
  createdByName: string;
}

export interface WorkTask {
  id: string;
  campusId: string;
  department: Department;
  eventId: string | null;
  eventTitle: string | null;
  assignedById: string;
  assignedByName: string;
  assignedToId: string;
  assignedToName: string;
  title: string;
  description: string;
  status: WorkTaskStatus;
  priority: TaskPriority;
  sortOrder: number;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CalendarItem {
  id: string;
  itemType: 'Event' | 'Meeting';
  campusId: string;
  campusName: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
}

export interface ActivityLog {
  id: string;
  department: Department;
  actorName: string;
  actionType: string;
  entityType: string;
  entityId: string;
  summary: string;
  occurredAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationFeed {
  unreadCount: number;
  items: NotificationItem[];
}
