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
[Route("api/v1")]
[Authorize]
public class CalendarHistoryNotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IStorageService _storage;

    public CalendarHistoryNotificationsController(AppDbContext db, ICurrentUserService currentUser, IStorageService storage)
    {
        _db = db;
        _currentUser = currentUser;
        _storage = storage;
    }

    [HttpGet("calendar/campus")]
    public async Task<ActionResult<List<CalendarItemDto>>> GetCampusCalendar(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        IQueryable<CampusEvent> evQuery = _db.Events.AsNoTracking()
            .Where(e => e.CampusId == campusId && e.Status == EventStatus.Confirmed)
            .Include(e => e.Campus);

        IQueryable<Meeting> mtQuery = _db.Meetings.AsNoTracking()
            .Where(m => m.CampusId == campusId)
            .Include(m => m.Campus);

        if (from.HasValue)
        {
            var f = from.Value.ToUniversalTime();
            evQuery = evQuery.Where(e => e.EndAt >= f);
            mtQuery = mtQuery.Where(m => m.EndAt >= f);
        }
        if (to.HasValue)
        {
            var t = to.Value.ToUniversalTime();
            evQuery = evQuery.Where(e => e.StartAt <= t);
            mtQuery = mtQuery.Where(m => m.StartAt <= t);
        }

        var events = await evQuery.ToListAsync(ct);
        var meetings = await mtQuery.ToListAsync(ct);

        var items = events.Select(e => new CalendarItemDto(
                e.Id, "Event", e.CampusId, e.Campus.Name, e.Title, e.Description, e.Venue, e.StartAt, e.EndAt))
            .Concat(meetings.Select(m => new CalendarItemDto(
                m.Id, "Meeting", m.CampusId, m.Campus.Name, m.Title, m.Agenda, m.Location, m.StartAt, m.EndAt)))
            .OrderBy(i => i.StartAt)
            .ToList();

        return Ok(items);
    }

    [HttpGet("calendar/university")]
    [AllowAnonymous]
    public async Task<ActionResult<List<PublicCampusEventDto>>> GetUniversityCalendar(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        return Ok(await QueryPublicEventsAsync(null, from, to, null, ct));
    }

    [HttpGet("cross-campus/events")]
    [AllowAnonymous]
    public async Task<ActionResult<List<PublicCampusEventDto>>> GetCrossCampusEvents(
        [FromQuery] Guid? campusId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        return Ok(await QueryPublicEventsAsync(campusId, from, to, search, ct));
    }

    [HttpGet("history")]
    public async Task<ActionResult<List<ActivityLogDto>>> GetHistory(
        [FromQuery] Department? department,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (!actor.IsLeadership() && !actor.IsDepartmentHead())
            throw new UnauthorizedAccessException("Only Campus Leadership and Department Heads can view quarterly activity history.");

        var campusId = actor.RequireCampusId();

        IQueryable<ActivityLog> query = _db.ActivityLogs.AsNoTracking()
            .Where(a => a.CampusId == campusId)
            .Include(a => a.Actor);

        if (actor.IsDepartmentHead())
        {
            query = query.Where(a => a.Department == actor.Department);
        }
        else if (department.HasValue)
        {
            query = query.Where(a => a.Department == department.Value);
        }

        if (from.HasValue) query = query.Where(a => a.OccurredAt >= from.Value.ToUniversalTime());
        if (to.HasValue) query = query.Where(a => a.OccurredAt <= to.Value.ToUniversalTime());

        var logs = await query.OrderByDescending(a => a.OccurredAt).Take(200).ToListAsync(ct);

        return Ok(logs.Select(a => new ActivityLogDto(
            a.Id, a.Department.ToString(), a.Actor?.FullName ?? string.Empty, a.ActionType, a.EntityType, a.EntityId, a.Summary, a.OccurredAt
        )).ToList());
    }

    [HttpGet("notifications")]
    public async Task<ActionResult<NotificationFeedDto>> GetNotifications([FromQuery] int limit = 30, CancellationToken ct = default)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var clamped = Math.Clamp(limit, 1, 100);

        var unreadCount = await _db.Notifications.CountAsync(n => n.UserId == actor.Id && !n.IsRead, ct);
        var items = await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == actor.Id)
            .OrderByDescending(n => n.CreatedAt)
            .Take(clamped)
            .Select(n => new NotificationDto(
                n.Id, n.Type.ToString(), n.Title, n.Message, n.ReferenceType, n.ReferenceId, n.IsRead, n.CreatedAt))
            .ToListAsync(ct);

        return Ok(new NotificationFeedDto(unreadCount, items));
    }

    [HttpPatch("notifications/{id:guid}/read")]
    public async Task<IActionResult> MarkNotificationRead(Guid id, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == actor.Id, ct)
            ?? throw new KeyNotFoundException("Notification not found.");

        notification.IsRead = true;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPatch("notifications/read-all")]
    public async Task<IActionResult> MarkAllNotificationsRead(CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var unread = await _db.Notifications.Where(n => n.UserId == actor.Id && !n.IsRead).ToListAsync(ct);
        foreach (var n in unread) n.IsRead = true;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<List<PublicCampusEventDto>> QueryPublicEventsAsync(
        Guid? campusId,
        DateTime? from,
        DateTime? to,
        string? search,
        CancellationToken ct)
    {
        IQueryable<CampusEvent> query = _db.Events.AsNoTracking()
            .Where(e => e.Status == EventStatus.Confirmed)
            .Include(e => e.Campus)
            .Include(e => e.Posters);

        if (campusId.HasValue) query = query.Where(e => e.CampusId == campusId.Value);
        if (from.HasValue) query = query.Where(e => e.EndAt >= from.Value.ToUniversalTime());
        if (to.HasValue) query = query.Where(e => e.StartAt <= to.Value.ToUniversalTime());
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(e => e.Title.ToLower().Contains(term) || e.Description.ToLower().Contains(term) || e.Venue.ToLower().Contains(term));
        }

        var events = await query.OrderBy(e => e.StartAt).ToListAsync(ct);
        return events.Select(e => new PublicCampusEventDto(
            e.Id,
            e.CampusId,
            e.Campus.Name,
            e.Title,
            e.Description,
            e.Venue,
            e.StartAt,
            e.EndAt,
            e.Posters.Select(p => _storage.GetPublicUrl(p.StorageKey)).ToList()
        )).ToList();
    }
}
