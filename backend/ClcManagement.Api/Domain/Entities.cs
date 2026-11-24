namespace ClcManagement.Api.Domain;

public class Campus
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Proposal> Proposals { get; set; } = new List<Proposal>();
    public ICollection<Club> Clubs { get; set; } = new List<Club>();
    public ICollection<CampusEvent> Events { get; set; } = new List<CampusEvent>();
    public ICollection<Meeting> Meetings { get; set; } = new List<Meeting>();
    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string EntraObjectId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public Guid? CampusId { get; set; }
    public Campus? Campus { get; set; }
    public UserRole Role { get; set; } = UserRole.Unassigned;
    public Department Department { get; set; } = Department.None;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Proposal
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CampusId { get; set; }
    public Campus Campus { get; set; } = null!;
    public Guid SubmittedById { get; set; }
    public User SubmittedBy { get; set; } = null!;
    public ProposalType ProposalType { get; set; }
    public ProposalStatus Status { get; set; } = ProposalStatus.Pending;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public DateTime? ProposedStartAt { get; set; }
    public DateTime? ProposedEndAt { get; set; }
    public string? ProposedVenue { get; set; }

    public Guid? ProposedClubHeadId { get; set; }
    public User? ProposedClubHead { get; set; }

    public Guid? TargetEventId { get; set; }
    public CampusEvent? TargetEvent { get; set; }
    public Guid? TargetClubId { get; set; }
    public Club? TargetClub { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ProposalReview> Reviews { get; set; } = new List<ProposalReview>();
}

public class ProposalReview
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProposalId { get; set; }
    public Proposal Proposal { get; set; } = null!;
    public Guid ReviewerId { get; set; }
    public User Reviewer { get; set; } = null!;
    public ReviewDecision Decision { get; set; }
    public string? Comment { get; set; }
    public DateTime ReviewedAt { get; set; } = DateTime.UtcNow;
}

public class Club
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CampusId { get; set; }
    public Campus Campus { get; set; } = null!;
    public Guid? SourceProposalId { get; set; }
    public Proposal? SourceProposal { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid ClubHeadId { get; set; }
    public User ClubHead { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CampusEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CampusId { get; set; }
    public Campus Campus { get; set; } = null!;
    public Guid? SourceProposalId { get; set; }
    public Proposal? SourceProposal { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Venue { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public EventStatus Status { get; set; } = EventStatus.Confirmed;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<EventPoster> Posters { get; set; } = new List<EventPoster>();
    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
}

public class EventPoster
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EventId { get; set; }
    public CampusEvent Event { get; set; } = null!;
    public Guid UploadedById { get; set; }
    public User UploadedBy { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string StorageKey { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

public class Meeting
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CampusId { get; set; }
    public Campus Campus { get; set; } = null!;
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Agenda { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class WorkTask
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CampusId { get; set; }
    public Campus Campus { get; set; } = null!;
    public Department Department { get; set; }
    public Guid? EventId { get; set; }
    public CampusEvent? Event { get; set; }
    public Guid AssignedById { get; set; }
    public User AssignedBy { get; set; } = null!;
    public Guid AssignedToId { get; set; }
    public User AssignedTo { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public WorkTaskStatus Status { get; set; } = WorkTaskStatus.ToDo;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public int SortOrder { get; set; }
    public DateTime? DueAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ActivityLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CampusId { get; set; }
    public Campus Campus { get; set; } = null!;
    public Department Department { get; set; }
    public Guid ActorId { get; set; }
    public User Actor { get; set; } = null!;
    public string ActionType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
