using ClcManagement.Api.Application.Auth;
using ClcManagement.Api.Application.DTOs;
using ClcManagement.Api.Application.Services;
using ClcManagement.Api.Domain;
using ClcManagement.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClcManagement.Api.Controllers;

[ApiController]
[Route("api/v1/proposals")]
[Authorize]
public class ProposalsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;

    public ProposalsController(AppDbContext db, ICurrentUserService currentUser, INotificationService notifications)
    {
        _db = db;
        _currentUser = currentUser;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProposalDto>>> GetProposals(
        [FromQuery] ProposalType? type,
        [FromQuery] ProposalStatus? status,
        CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        IQueryable<Proposal> query = _db.Proposals.AsNoTracking()
            .Where(p => p.CampusId == campusId)
            .Include(p => p.SubmittedBy)
            .Include(p => p.ProposedClubHead)
            .Include(p => p.Reviews).ThenInclude(r => r.Reviewer);

        if (!actor.IsLeadership())
        {
            var allowedType = DepartmentToProposalType(actor.Department);
            if (!allowedType.HasValue)
                return Ok(new List<ProposalDto>());
            query = query.Where(p => p.ProposalType == allowedType.Value);
        }

        if (type.HasValue)
            query = query.Where(p => p.ProposalType == type.Value);
        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);

        var items = await query.OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return Ok(items.Select(ToDto).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProposalDto>> GetProposal(Guid id, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        var proposal = await _db.Proposals.AsNoTracking()
            .Include(p => p.SubmittedBy)
            .Include(p => p.ProposedClubHead)
            .Include(p => p.Reviews).ThenInclude(r => r.Reviewer)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Proposal not found.");

        if (proposal.CampusId != campusId)
            throw new UnauthorizedAccessException("Cannot access proposals from another campus.");

        if (!actor.IsLeadership() && DepartmentToProposalType(actor.Department) != proposal.ProposalType)
            throw new UnauthorizedAccessException("You can only view proposals for your department.");

        return Ok(ToDto(proposal));
    }

    [HttpPost]
    public async Task<ActionResult<ProposalDto>> CreateProposal([FromBody] CreateProposalRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        ValidateDepartmentForProposalType(actor, request.ProposalType);
        ValidateProposalFields(request.ProposalType, request.Title, request.ProposedStartAt, request.ProposedEndAt, request.ProposedVenue, request.ProposedClubHeadId, request.TargetEventId, request.TargetClubId);

        var proposal = new Proposal
        {
            CampusId = campusId,
            SubmittedById = actor.Id,
            ProposalType = request.ProposalType,
            Status = ProposalStatus.Pending,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            ProposedStartAt = request.ProposedStartAt?.ToUniversalTime(),
            ProposedEndAt = request.ProposedEndAt?.ToUniversalTime(),
            ProposedVenue = request.ProposedVenue?.Trim(),
            ProposedClubHeadId = request.ProposedClubHeadId,
            TargetEventId = request.TargetEventId,
            TargetClubId = request.TargetClubId
        };

        _db.Proposals.Add(proposal);
        await _db.SaveChangesAsync(ct);

        var leaderIds = await _db.Users
            .Where(u => u.CampusId == campusId && (u.Role == UserRole.CampusHead || u.Role == UserRole.Deputy))
            .Select(u => u.Id)
            .ToListAsync(ct);

        await _notifications.SendToManyAsync(
            leaderIds,
            NotificationType.ProposalSubmitted,
            $"New {proposal.ProposalType} Proposal",
            $"{actor.FullName} submitted \"{proposal.Title}\" for review.",
            "Proposal",
            proposal.Id,
            ct);

        var loaded = await LoadProposalAsync(proposal.Id, ct);
        return CreatedAtAction(nameof(GetProposal), new { id = proposal.Id }, ToDto(loaded));
    }

    [HttpPut("{id:guid}/resubmit")]
    public async Task<ActionResult<ProposalDto>> ResubmitProposal(Guid id, [FromBody] ResubmitProposalRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        var proposal = await _db.Proposals.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Proposal not found.");

        if (proposal.CampusId != campusId)
            throw new UnauthorizedAccessException("Cannot modify proposals from another campus.");

        ValidateDepartmentForProposalType(actor, proposal.ProposalType);

        if (proposal.Status != ProposalStatus.ChangesRequested)
            throw new InvalidOperationException("Only proposals with status 'ChangesRequested' can be resubmitted.");

        ValidateProposalFields(proposal.ProposalType, request.Title, request.ProposedStartAt, request.ProposedEndAt, request.ProposedVenue, request.ProposedClubHeadId, request.TargetEventId, request.TargetClubId);

        proposal.Title = request.Title.Trim();
        proposal.Description = request.Description.Trim();
        proposal.ProposedStartAt = request.ProposedStartAt?.ToUniversalTime();
        proposal.ProposedEndAt = request.ProposedEndAt?.ToUniversalTime();
        proposal.ProposedVenue = request.ProposedVenue?.Trim();
        proposal.ProposedClubHeadId = request.ProposedClubHeadId;
        proposal.TargetEventId = request.TargetEventId;
        proposal.TargetClubId = request.TargetClubId;
        proposal.Status = ProposalStatus.Pending;
        proposal.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var leaderIds = await _db.Users
            .Where(u => u.CampusId == campusId && (u.Role == UserRole.CampusHead || u.Role == UserRole.Deputy))
            .Select(u => u.Id)
            .ToListAsync(ct);

        await _notifications.SendToManyAsync(
            leaderIds,
            NotificationType.ProposalSubmitted,
            $"Proposal Resubmitted: {proposal.Title}",
            $"{actor.FullName} updated and resubmitted \"{proposal.Title}\".",
            "Proposal",
            proposal.Id,
            ct);

        var loaded = await LoadProposalAsync(proposal.Id, ct);
        return Ok(ToDto(loaded));
    }

    [HttpPost("{id:guid}/review")]
    public async Task<ActionResult<ProposalDto>> ReviewProposal(Guid id, [FromBody] ReviewProposalRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (!actor.IsLeadership())
            throw new UnauthorizedAccessException("Only Campus Head or Deputy can review proposals.");

        var campusId = actor.RequireCampusId();
        var proposal = await _db.Proposals.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Proposal not found.");

        if (proposal.CampusId != campusId)
            throw new UnauthorizedAccessException("Cannot review proposals from another campus.");

        if (proposal.Status != ProposalStatus.Pending)
            throw new InvalidOperationException($"Proposal is currently '{proposal.Status}'. Only 'Pending' proposals can be reviewed.");

        if (request.Decision is ReviewDecision.ChangesRequested or ReviewDecision.Rejected &&
            string.IsNullOrWhiteSpace(request.Comment))
        {
            throw new InvalidOperationException("A reason/comment is mandatory when requesting changes or rejecting a proposal.");
        }

        proposal.Status = request.Decision switch
        {
            ReviewDecision.Approved => ProposalStatus.Approved,
            ReviewDecision.ChangesRequested => ProposalStatus.ChangesRequested,
            ReviewDecision.Rejected => ProposalStatus.Rejected,
            _ => throw new InvalidOperationException("Invalid review decision.")
        };
        proposal.UpdatedAt = DateTime.UtcNow;

        _db.ProposalReviews.Add(new ProposalReview
        {
            ProposalId = proposal.Id,
            ReviewerId = actor.Id,
            Decision = request.Decision,
            Comment = request.Comment?.Trim()
        });

        if (request.Decision == ReviewDecision.Approved && proposal.ProposalType == ProposalType.Club)
        {
            var clubHeadId = proposal.ProposedClubHeadId ?? proposal.SubmittedById;
            _db.Clubs.Add(new Club
            {
                CampusId = campusId,
                SourceProposalId = proposal.Id,
                Name = proposal.Title,
                Description = proposal.Description,
                ClubHeadId = clubHeadId,
                IsActive = true
            });
        }

        if (request.Decision == ReviewDecision.Approved)
        {
            _db.ActivityLogs.Add(new ActivityLog
            {
                CampusId = campusId,
                Department = ProposalTypeToDepartment(proposal.ProposalType),
                ActorId = actor.Id,
                ActionType = "ProposalApproved",
                EntityType = "Proposal",
                EntityId = proposal.Id,
                Summary = $"Approved {proposal.ProposalType} proposal: {proposal.Title}"
            });
        }

        await _db.SaveChangesAsync(ct);

        var notifType = request.Decision switch
        {
            ReviewDecision.Approved => NotificationType.ProposalApproved,
            ReviewDecision.ChangesRequested => NotificationType.ProposalChangesRequested,
            _ => NotificationType.ProposalRejected
        };

        var msg = string.IsNullOrWhiteSpace(request.Comment)
            ? $"Your proposal \"{proposal.Title}\" was {request.Decision} by {actor.FullName}."
            : $"Your proposal \"{proposal.Title}\" was {request.Decision} by {actor.FullName}: {request.Comment}";

        await _notifications.SendAsync(
            proposal.SubmittedById,
            notifType,
            $"Proposal {request.Decision}",
            msg,
            "Proposal",
            proposal.Id,
            ct);

        var loaded = await LoadProposalAsync(proposal.Id, ct);
        return Ok(ToDto(loaded));
    }

    private async Task<Proposal> LoadProposalAsync(Guid id, CancellationToken ct) =>
        await _db.Proposals.AsNoTracking()
            .Include(p => p.SubmittedBy)
            .Include(p => p.ProposedClubHead)
            .Include(p => p.Reviews).ThenInclude(r => r.Reviewer)
            .FirstAsync(p => p.Id == id, ct);

    private static void ValidateDepartmentForProposalType(User actor, ProposalType type)
    {
        var requiredDept = ProposalTypeToDepartment(type);
        if (!actor.BelongsToDepartment(requiredDept))
            throw new UnauthorizedAccessException($"Only {requiredDept} department members can submit or edit {type} proposals.");
    }

    private static void ValidateProposalFields(
        ProposalType type,
        string title,
        DateTime? startAt,
        DateTime? endAt,
        string? venue,
        Guid? clubHeadId,
        Guid? targetEventId,
        Guid? targetClubId)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Proposal title is required.");

        if (type == ProposalType.Event)
        {
            if (!startAt.HasValue || !endAt.HasValue || endAt <= startAt)
                throw new ArgumentException("Event proposals require a valid start and end time.");
            if (string.IsNullOrWhiteSpace(venue))
                throw new ArgumentException("Event proposals require a proposed venue.");
        }
        else if (type == ProposalType.Club)
        {
            if (!clubHeadId.HasValue)
                throw new ArgumentException("Club proposals must designate a Club Head.");
        }
        else if (type == ProposalType.Marketing)
        {
            if (!targetEventId.HasValue && !targetClubId.HasValue)
                throw new ArgumentException("Marketing proposals must be linked to an event or club.");
        }
    }

    private static ProposalType? DepartmentToProposalType(Department dept) => dept switch
    {
        Department.Events => ProposalType.Event,
        Department.Clubs => ProposalType.Club,
        Department.Marketing => ProposalType.Marketing,
        _ => null
    };

    private static Department ProposalTypeToDepartment(ProposalType type) => type switch
    {
        ProposalType.Event => Department.Events,
        ProposalType.Club => Department.Clubs,
        ProposalType.Marketing => Department.Marketing,
        _ => Department.None
    };

    private static ProposalDto ToDto(Proposal p) => new(
        p.Id,
        p.CampusId,
        p.SubmittedById,
        p.SubmittedBy?.FullName ?? string.Empty,
        p.ProposalType.ToString(),
        p.Status.ToString(),
        p.Title,
        p.Description,
        p.ProposedStartAt,
        p.ProposedEndAt,
        p.ProposedVenue,
        p.ProposedClubHeadId,
        p.ProposedClubHead?.FullName,
        p.TargetEventId,
        p.TargetClubId,
        p.CreatedAt,
        p.UpdatedAt,
        p.Reviews.OrderByDescending(r => r.ReviewedAt)
            .Select(r => new ProposalReviewDto(r.Id, r.ReviewerId, r.Reviewer?.FullName ?? string.Empty, r.Decision.ToString(), r.Comment, r.ReviewedAt))
            .ToList());
}
