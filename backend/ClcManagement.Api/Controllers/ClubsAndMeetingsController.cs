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
[Route("api/v1")]
[Authorize]
public class ClubsAndMeetingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;

    public ClubsAndMeetingsController(AppDbContext db, ICurrentUserService currentUser, INotificationService notifications)
    {
        _db = db;
        _currentUser = currentUser;
        _notifications = notifications;
    }

    [HttpGet("clubs")]
    public async Task<ActionResult<List<ClubDto>>> GetClubs(CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        var clubs = await _db.Clubs.AsNoTracking()
            .Where(c => c.CampusId == campusId)
            .Include(c => c.ClubHead)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        return Ok(clubs.Select(c => new ClubDto(
            c.Id, c.CampusId, c.Name, c.Description, c.ClubHeadId, c.ClubHead?.FullName ?? string.Empty, c.IsActive, c.CreatedAt
        )).ToList());
    }

    [HttpPatch("clubs/{id:guid}/head")]
    public async Task<ActionResult<ClubDto>> AssignClubHead(Guid id, [FromBody] AssignClubHeadRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (actor.Role != UserRole.ClubsHead && actor.Role != UserRole.CampusHead)
            throw new UnauthorizedAccessException("Only Clubs Head or Campus Head can assign a Club Head.");

        var campusId = actor.RequireCampusId();
        var club = await _db.Clubs.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException("Club not found.");

        if (club.CampusId != campusId)
            throw new UnauthorizedAccessException("Cannot modify clubs from another campus.");

        var newHead = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.ClubHeadId && u.CampusId == campusId, ct)
            ?? throw new ArgumentException("Selected Club Head must belong to your campus.");

        club.ClubHeadId = newHead.Id;
        await _db.SaveChangesAsync(ct);

        return Ok(new ClubDto(club.Id, club.CampusId, club.Name, club.Description, club.ClubHeadId, newHead.FullName, club.IsActive, club.CreatedAt));
    }

    [HttpGet("meetings")]
    public async Task<ActionResult<List<MeetingDto>>> GetMeetings(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        IQueryable<Meeting> query = _db.Meetings.AsNoTracking()
            .Where(m => m.CampusId == campusId)
            .Include(m => m.CreatedBy);

        if (from.HasValue)
            query = query.Where(m => m.EndAt >= from.Value.ToUniversalTime());
        if (to.HasValue)
            query = query.Where(m => m.StartAt <= to.Value.ToUniversalTime());

        var meetings = await query.OrderBy(m => m.StartAt).ToListAsync(ct);
        return Ok(meetings.Select(m => new MeetingDto(
            m.Id, m.CampusId, m.Title, m.Agenda, m.Location, m.StartAt, m.EndAt, m.CreatedBy?.FullName ?? string.Empty
        )).ToList());
    }

    [HttpPost("meetings")]
    public async Task<ActionResult<MeetingDto>> CreateMeeting([FromBody] CreateMeetingRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (!actor.IsLeadership())
            throw new UnauthorizedAccessException("Only Campus Head or Deputy can schedule campus meetings.");

        var campusId = actor.RequireCampusId();
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Location))
            throw new ArgumentException("Meeting title and location are required.");

        var startUtc = request.StartAt.ToUniversalTime();
        var endUtc = request.EndAt.ToUniversalTime();
        if (endUtc <= startUtc)
            throw new ArgumentException("Meeting end time must be after start time.");

        var meeting = new Meeting
        {
            CampusId = campusId,
            CreatedById = actor.Id,
            Title = request.Title.Trim(),
            Agenda = request.Agenda.Trim(),
            Location = request.Location.Trim(),
            StartAt = startUtc,
            EndAt = endUtc
        };

        _db.Meetings.Add(meeting);
        await _db.SaveChangesAsync(ct);

        var campusUserIds = await _db.Users
            .Where(u => u.CampusId == campusId && u.Id != actor.Id && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync(ct);

        await _notifications.SendToManyAsync(
            campusUserIds,
            NotificationType.MeetingScheduled,
            $"Campus Meeting: {meeting.Title}",
            $"{actor.FullName} scheduled \"{meeting.Title}\" at {meeting.Location} ({meeting.StartAt:dd MMM HH:mm} UTC).",
            "Meeting",
            meeting.Id,
            ct);

        return CreatedAtAction(nameof(GetMeetings), new { id = meeting.Id },
            new MeetingDto(meeting.Id, meeting.CampusId, meeting.Title, meeting.Agenda, meeting.Location, meeting.StartAt, meeting.EndAt, actor.FullName));
    }

    [HttpDelete("meetings/{id:guid}")]
    public async Task<IActionResult> DeleteMeeting(Guid id, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (!actor.IsLeadership())
            throw new UnauthorizedAccessException("Only Campus Head or Deputy can cancel campus meetings.");

        var campusId = actor.RequireCampusId();
        var meeting = await _db.Meetings.FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw new KeyNotFoundException("Meeting not found.");

        if (meeting.CampusId != campusId)
            throw new UnauthorizedAccessException("Cannot delete meetings from another campus.");

        _db.Meetings.Remove(meeting);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
