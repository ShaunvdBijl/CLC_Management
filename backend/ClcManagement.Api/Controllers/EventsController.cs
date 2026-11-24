using ClcManagement.Api.Application.Auth;
using ClcManagement.Api.Application.DTOs;
using ClcManagement.Api.Domain;
using ClcManagement.Api.Infrastructure.Data;
using ClcManagement.Api.Infrastructure.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClcManagement.Api.Controllers;

[ApiController]
[Route("api/v1/events")]
[Authorize]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IStorageService _storage;

    public EventsController(AppDbContext db, ICurrentUserService currentUser, IStorageService storage)
    {
        _db = db;
        _currentUser = currentUser;
        _storage = storage;
    }

    [HttpGet]
    public async Task<ActionResult<List<EventDto>>> GetEvents(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? clubId,
        CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        IQueryable<CampusEvent> query = _db.Events.AsNoTracking()
            .Where(e => e.CampusId == campusId)
            .Include(e => e.Campus)
            .Include(e => e.Club)
            .Include(e => e.Posters);

        if (from.HasValue)
            query = query.Where(e => e.EndAt >= from.Value.ToUniversalTime());
        if (to.HasValue)
            query = query.Where(e => e.StartAt <= to.Value.ToUniversalTime());
        if (clubId.HasValue)
            query = query.Where(e => e.ClubId == clubId.Value);

        var list = await query.OrderBy(e => e.StartAt).ToListAsync(ct);
        return Ok(list.Select(ToDto).ToList());
    }

    [HttpGet("conflicts")]
    public async Task<ActionResult<ConflictCheckResponse>> CheckConflicts(
        [FromQuery] DateTime startAt,
        [FromQuery] DateTime endAt,
        [FromQuery] string? venue,
        [FromQuery] Guid? excludeEventId,
        CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        var startUtc = startAt.ToUniversalTime();
        var endUtc = endAt.ToUniversalTime();
        if (endUtc <= startUtc)
            throw new ArgumentException("endAt must be after startAt.");

        var overlapping = await _db.Events.AsNoTracking()
            .Where(e => e.CampusId == campusId &&
                        e.Status == EventStatus.Confirmed &&
                        (!excludeEventId.HasValue || e.Id != excludeEventId.Value) &&
                        e.StartAt < endUtc &&
                        e.EndAt > startUtc)
            .OrderBy(e => e.StartAt)
            .ToListAsync(ct);

        var conflicts = overlapping.Select(e =>
        {
            var sameVenue = !string.IsNullOrWhiteSpace(venue) &&
                            e.Venue.Equals(venue.Trim(), StringComparison.OrdinalIgnoreCase);
            return new ConflictItemDto(
                e.Id,
                e.Title,
                e.Venue,
                e.StartAt,
                e.EndAt,
                sameVenue ? "VenueAndTimeOverlap" : "TimeOverlap");
        }).ToList();

        return Ok(new ConflictCheckResponse(conflicts.Count > 0, conflicts));
    }

    [HttpPost]
    public async Task<ActionResult<EventDto>> CreateEvent([FromBody] CreateEventRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var isClubEventByClubsDept = request.ClubId.HasValue && actor.BelongsToDepartment(Department.Clubs);

        if (!actor.BelongsToDepartment(Department.Events) && !actor.IsLeadership() && !isClubEventByClubsDept)
            throw new UnauthorizedAccessException("Only Events dept, Clubs dept (for club events), or Campus Leadership can publish events.");

        var campusId = actor.RequireCampusId();
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Venue))
            throw new ArgumentException("Title and Venue are required.");

        var startUtc = request.StartAt.ToUniversalTime();
        var endUtc = request.EndAt.ToUniversalTime();
        if (endUtc <= startUtc)
            throw new ArgumentException("Event end time must be after start time.");

        if (request.ClubId.HasValue)
        {
            var clubExists = await _db.Clubs.AnyAsync(c => c.Id == request.ClubId.Value && c.CampusId == campusId, ct);
            if (!clubExists)
                throw new ArgumentException("Selected club does not belong to your campus.");
        }

        if (request.SourceProposalId.HasValue)
        {
            var proposal = await _db.Proposals.FirstOrDefaultAsync(p => p.Id == request.SourceProposalId.Value, ct)
                ?? throw new KeyNotFoundException("Linked proposal not found.");
            if (proposal.CampusId != campusId || proposal.Status != ProposalStatus.Approved)
                throw new InvalidOperationException("Linked proposal must belong to your campus and be Approved.");
        }

        var ev = new CampusEvent
        {
            CampusId = campusId,
            SourceProposalId = request.SourceProposalId,
            ClubId = request.ClubId,
            CreatedById = actor.Id,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Venue = request.Venue.Trim(),
            StartAt = startUtc,
            EndAt = endUtc,
            Status = EventStatus.Confirmed
        };

        _db.Events.Add(ev);
        _db.ActivityLogs.Add(new ActivityLog
        {
            CampusId = campusId,
            Department = request.ClubId.HasValue ? Department.Clubs : Department.Events,
            ActorId = actor.Id,
            ActionType = "EventConfirmed",
            EntityType = "Event",
            EntityId = ev.Id,
            Summary = request.ClubId.HasValue
                ? $"Confirmed club event: {ev.Title} ({ev.Venue})"
                : $"Confirmed campus-wide event: {ev.Title} ({ev.Venue})"
        });

        await _db.SaveChangesAsync(ct);

        var loaded = await _db.Events.AsNoTracking()
            .Include(e => e.Campus)
            .Include(e => e.Club)
            .Include(e => e.Posters)
            .FirstAsync(e => e.Id == ev.Id, ct);

        return CreatedAtAction(nameof(GetEvents), new { id = ev.Id }, ToDto(loaded));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<EventDto>> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (actor.Role != UserRole.EventsHead && actor.Role != UserRole.ClubsHead && !actor.IsLeadership())
            throw new UnauthorizedAccessException("Only Events Head, Clubs Head, or Campus Leadership can update events.");

        var campusId = actor.RequireCampusId();
        var ev = await _db.Events.Include(e => e.Campus).Include(e => e.Club).Include(e => e.Posters)
            .FirstOrDefaultAsync(e => e.Id == id, ct)
            ?? throw new KeyNotFoundException("Event not found.");

        if (ev.CampusId != campusId && !actor.IsAdmin())
            throw new UnauthorizedAccessException("Cannot modify events from another campus.");

        var startUtc = request.StartAt.ToUniversalTime();
        var endUtc = request.EndAt.ToUniversalTime();
        if (endUtc <= startUtc)
            throw new ArgumentException("Event end time must be after start time.");

        ev.Title = request.Title.Trim();
        ev.Description = request.Description.Trim();
        ev.Venue = request.Venue.Trim();
        ev.StartAt = startUtc;
        ev.EndAt = endUtc;
        ev.Status = request.Status;
        ev.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(ev));
    }

    [HttpPost("{id:guid}/posters")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<EventPosterDto>> UploadPoster(Guid id, IFormFile file, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (!actor.BelongsToDepartment(Department.Marketing))
            throw new UnauthorizedAccessException("Only the Marketing department (or Admin) can upload promotional posters.");

        var campusId = actor.RequireCampusId();
        var ev = await _db.Events.FirstOrDefaultAsync(e => e.Id == id, ct)
            ?? throw new KeyNotFoundException("Event not found.");

        if (ev.CampusId != campusId && !actor.IsAdmin())
            throw new UnauthorizedAccessException("Cannot upload posters for another campus's event.");

        if (file is null || file.Length == 0)
            throw new ArgumentException("Poster image file is required.");

        await using var stream = file.OpenReadStream();
        var stored = await _storage.UploadAsync(stream, file.FileName, file.ContentType, ev.CampusId, ev.Id, ct);

        var poster = new EventPoster
        {
            EventId = ev.Id,
            UploadedById = actor.Id,
            FileName = stored.FileName,
            StorageKey = stored.StorageKey,
            ContentType = stored.ContentType,
            FileSizeBytes = stored.FileSizeBytes
        };

        _db.EventPosters.Add(poster);
        _db.ActivityLogs.Add(new ActivityLog
        {
            CampusId = ev.CampusId,
            Department = Department.Marketing,
            ActorId = actor.Id,
            ActionType = "PosterUploaded",
            EntityType = "Event",
            EntityId = ev.Id,
            Summary = $"Uploaded poster '{poster.FileName}' for event: {ev.Title}"
        });

        await _db.SaveChangesAsync(ct);

        return Ok(new EventPosterDto(
            poster.Id,
            poster.FileName,
            _storage.GetPublicUrl(poster.StorageKey),
            poster.ContentType,
            poster.FileSizeBytes,
            poster.UploadedAt));
    }

    [HttpDelete("{id:guid}/posters/{posterId:guid}")]
    public async Task<IActionResult> DeletePoster(Guid id, Guid posterId, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (actor.Role != UserRole.MarketingHead && !actor.IsAdmin())
            throw new UnauthorizedAccessException("Only Marketing Head or Admin can remove event posters.");

        var campusId = actor.RequireCampusId();
        var poster = await _db.EventPosters.Include(p => p.Event)
            .FirstOrDefaultAsync(p => p.Id == posterId && p.EventId == id, ct)
            ?? throw new KeyNotFoundException("Poster not found.");

        if (poster.Event.CampusId != campusId && !actor.IsAdmin())
            throw new UnauthorizedAccessException("Cannot delete posters from another campus.");

        await _storage.DeleteAsync(poster.StorageKey, ct);
        _db.EventPosters.Remove(poster);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private EventDto ToDto(CampusEvent e) => new(
        e.Id,
        e.CampusId,
        e.Campus?.Name ?? string.Empty,
        e.SourceProposalId,
        e.ClubId,
        e.Club?.Name,
        e.Title,
        e.Description,
        e.Venue,
        e.StartAt,
        e.EndAt,
        e.Status.ToString(),
        e.Posters.OrderByDescending(p => p.UploadedAt)
            .Select(p => new EventPosterDto(p.Id, p.FileName, _storage.GetPublicUrl(p.StorageKey), p.ContentType, p.FileSizeBytes, p.UploadedAt))
            .ToList());
}
