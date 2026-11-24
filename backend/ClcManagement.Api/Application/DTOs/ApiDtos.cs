using ClcManagement.Api.Domain;

namespace ClcManagement.Api.Application.DTOs;

public record UserProfileDto(
    Guid Id,
    string Email,
    string FullName,
    Guid? CampusId,
    string? CampusName,
    string Role,
    string Department,
    bool IsActive);

public record UpdateUserRoleRequest(UserRole Role, Department Department, Guid? CampusId);

public record SignUpRequest(string FullName, string Email, Guid? PreferredCampusId);

public record CampusDto(
    Guid Id,
    string Name,
    string Code,
    string Address,
    string Province,
    string ImageUrl,
    string Description,
    int ConfirmedEventCount);

public record CreateProposalRequest(
    ProposalType ProposalType,
    string Title,
    string Description,
    DateTime? ProposedStartAt,
    DateTime? ProposedEndAt,
    string? ProposedVenue,
    Guid? ProposedClubHeadId,
    Guid? TargetEventId,
    Guid? TargetClubId,
    string? ClubWhatTheyDo = null,
    string? ClubMeetingSchedule = null,
    string? ClubMeetingLocation = null,
    string? WhatsAppMessage = null);

public record ResubmitProposalRequest(
    string Title,
    string Description,
    DateTime? ProposedStartAt,
    DateTime? ProposedEndAt,
    string? ProposedVenue,
    Guid? ProposedClubHeadId,
    Guid? TargetEventId,
    Guid? TargetClubId,
    string? ClubWhatTheyDo = null,
    string? ClubMeetingSchedule = null,
    string? ClubMeetingLocation = null,
    string? WhatsAppMessage = null);

public record ReviewProposalRequest(ReviewDecision Decision, string? Comment);

public record ProposalReviewDto(
    Guid Id,
    Guid ReviewerId,
    string ReviewerName,
    string Decision,
    string? Comment,
    DateTime ReviewedAt);

public record ProposalDto(
    Guid Id,
    Guid CampusId,
    Guid SubmittedById,
    string SubmittedByName,
    string ProposalType,
    string Status,
    string Title,
    string Description,
    DateTime? ProposedStartAt,
    DateTime? ProposedEndAt,
    string? ProposedVenue,
    Guid? ProposedClubHeadId,
    string? ProposedClubHeadName,
    Guid? TargetEventId,
    string? TargetEventTitle,
    Guid? TargetClubId,
    string? TargetClubName,
    string? ClubWhatTheyDo,
    string? ClubMeetingSchedule,
    string? ClubMeetingLocation,
    string? WhatsAppMessage,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<ProposalReviewDto> Reviews);

public record CreateEventRequest(
    Guid? SourceProposalId,
    string Title,
    string Description,
    string Venue,
    DateTime StartAt,
    DateTime EndAt,
    Guid? ClubId = null);

public record UpdateEventRequest(
    string Title,
    string Description,
    string Venue,
    DateTime StartAt,
    DateTime EndAt,
    EventStatus Status);

public record EventPosterDto(
    Guid Id,
    string FileName,
    string Url,
    string ContentType,
    long FileSizeBytes,
    DateTime UploadedAt);

public record EventDto(
    Guid Id,
    Guid CampusId,
    string CampusName,
    Guid? SourceProposalId,
    Guid? ClubId,
    string? ClubName,
    string Title,
    string Description,
    string Venue,
    DateTime StartAt,
    DateTime EndAt,
    string Status,
    List<EventPosterDto> Posters);

public record PublicCampusEventDto(
    Guid EventId,
    Guid CampusId,
    string CampusName,
    string? ClubName,
    string Title,
    string Description,
    string Venue,
    DateTime StartAt,
    DateTime EndAt,
    List<string> PosterUrls);

public record ConflictItemDto(
    Guid EventId,
    string Title,
    string Venue,
    DateTime StartAt,
    DateTime EndAt,
    string ConflictType);

public record ConflictCheckResponse(bool HasConflict, List<ConflictItemDto> Conflicts);

public record CreateClubRequest(
    string Name,
    string Description,
    string WhatTheyDo,
    string MeetingSchedule,
    string MeetingLocation,
    Guid ClubHeadId);

public record UpdateClubRequest(
    string Name,
    string Description,
    string WhatTheyDo,
    string MeetingSchedule,
    string MeetingLocation,
    Guid ClubHeadId);

public record ClubDto(
    Guid Id,
    Guid CampusId,
    string Name,
    string Description,
    string WhatTheyDo,
    string MeetingSchedule,
    string MeetingLocation,
    Guid ClubHeadId,
    string ClubHeadName,
    bool IsActive,
    DateTime CreatedAt);

public record AssignClubHeadRequest(Guid ClubHeadId);

public record CreateMeetingRequest(
    string Title,
    string Agenda,
    string Location,
    DateTime StartAt,
    DateTime EndAt);

public record MeetingDto(
    Guid Id,
    Guid CampusId,
    string Title,
    string Agenda,
    string Location,
    DateTime StartAt,
    DateTime EndAt,
    string CreatedByName);

public record CreateTaskRequest(
    Guid? EventId,
    Guid AssignedToId,
    string Title,
    string Description,
    TaskPriority Priority,
    DateTime? DueAt);

public record UpdateTaskRequest(
    Guid? EventId,
    Guid AssignedToId,
    string Title,
    string Description,
    TaskPriority Priority,
    DateTime? DueAt);

public record UpdateTaskStatusRequest(WorkTaskStatus Status, int SortOrder);

public record WorkTaskDto(
    Guid Id,
    Guid CampusId,
    string Department,
    Guid? EventId,
    string? EventTitle,
    Guid AssignedById,
    string AssignedByName,
    Guid AssignedToId,
    string AssignedToName,
    string Title,
    string Description,
    string Status,
    string Priority,
    int SortOrder,
    DateTime? DueAt,
    DateTime? CompletedAt,
    DateTime CreatedAt);

public record CalendarItemDto(
    Guid Id,
    string ItemType,
    Guid CampusId,
    string CampusName,
    string Title,
    string Description,
    string Location,
    DateTime StartAt,
    DateTime EndAt);

public record ActivityLogDto(
    Guid Id,
    string Department,
    string ActorName,
    string ActionType,
    string EntityType,
    Guid EntityId,
    string Summary,
    DateTime OccurredAt);

public record NotificationDto(
    Guid Id,
    string Type,
    string Title,
    string Message,
    string? ReferenceType,
    Guid? ReferenceId,
    bool IsRead,
    DateTime CreatedAt);

public record NotificationFeedDto(int UnreadCount, List<NotificationDto> Items);
