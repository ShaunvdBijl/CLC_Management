namespace ClcManagement.Api.Domain;

public enum UserRole
{
    Unassigned = 0,
    CampusHead = 1,
    Deputy = 2,
    EventsHead = 3,
    ClubsHead = 4,
    MarketingHead = 5,
    DepartmentMember = 6,
    Admin = 7
}

public enum Department
{
    None = 0,
    Events = 1,
    Clubs = 2,
    Marketing = 3
}

public enum ProposalType
{
    Event = 0,
    Club = 1,
    Marketing = 2
}

public enum ProposalStatus
{
    Pending = 0,
    Approved = 1,
    ChangesRequested = 2,
    Rejected = 3
}

public enum ReviewDecision
{
    Approved = 0,
    ChangesRequested = 1,
    Rejected = 2
}

public enum EventStatus
{
    Confirmed = 0,
    Cancelled = 1
}

public enum WorkTaskStatus
{
    ToDo = 0,
    InProgress = 1,
    Done = 2
}

public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

public enum NotificationType
{
    TaskAssigned = 0,
    MeetingScheduled = 1,
    ProposalApproved = 2,
    ProposalChangesRequested = 3,
    ProposalRejected = 4,
    ProposalSubmitted = 5
}
