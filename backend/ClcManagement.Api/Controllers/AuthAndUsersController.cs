using ClcManagement.Api.Application.Auth;
using ClcManagement.Api.Application.DTOs;
using ClcManagement.Api.Domain;
using ClcManagement.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClcManagement.Api.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public class AuthAndUsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IWebHostEnvironment _env;

    public AuthAndUsersController(AppDbContext db, ICurrentUserService currentUser, IWebHostEnvironment env)
    {
        _db = db;
        _currentUser = currentUser;
        _env = env;
    }

    [HttpGet("auth/me")]
    public async Task<ActionResult<UserProfileDto>> GetMe(CancellationToken ct)
    {
        var user = await _currentUser.RequireCurrentUserAsync(User, ct);
        return Ok(ToDto(user));
    }

    [HttpGet("auth/dev-users")]
    [AllowAnonymous]
    public async Task<ActionResult<List<UserProfileDto>>> GetDevUsers(CancellationToken ct)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var users = await _db.Users.AsNoTracking()
            .Include(u => u.Campus)
            .OrderBy(u => u.CampusId)
            .ThenBy(u => u.Role)
            .ToListAsync(ct);

        return Ok(users.Select(ToDto).ToList());
    }

    [HttpGet("campuses")]
    public async Task<ActionResult<object>> GetCampuses(CancellationToken ct)
    {
        var campuses = await _db.Campuses.AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.Code })
            .ToListAsync(ct);

        return Ok(campuses);
    }

    [HttpGet("users")]
    public async Task<ActionResult<List<UserProfileDto>>> GetUsers(
        [FromQuery] Department? department,
        [FromQuery] UserRole? role,
        [FromQuery] bool unassigned = false,
        CancellationToken ct = default)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (!actor.IsLeadership() && !actor.IsDepartmentHead())
            throw new UnauthorizedAccessException("Only Campus Leadership or Department Heads can view the user roster.");

        var campusId = actor.RequireCampusId();

        IQueryable<User> query = _db.Users.AsNoTracking().Include(u => u.Campus);

        if (unassigned)
        {
            if (actor.Role != UserRole.CampusHead)
                throw new UnauthorizedAccessException("Only the Campus Head can view unassigned users.");
            query = query.Where(u => u.Role == UserRole.Unassigned || u.CampusId == null);
        }
        else
        {
            query = query.Where(u => u.CampusId == campusId);
        }

        if (department.HasValue)
            query = query.Where(u => u.Department == department.Value);

        if (role.HasValue)
            query = query.Where(u => u.Role == role.Value);

        var list = await query.OrderBy(u => u.FullName).ToListAsync(ct);
        return Ok(list.Select(ToDto).ToList());
    }

    [HttpPatch("users/{id:guid}/role")]
    public async Task<ActionResult<UserProfileDto>> UpdateUserRole(
        Guid id,
        [FromBody] UpdateUserRoleRequest request,
        CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (actor.Role != UserRole.CampusHead)
            throw new UnauthorizedAccessException("Only the Campus Head can promote, demote, or transfer members.");

        var actorCampusId = actor.RequireCampusId();
        var target = await _db.Users.Include(u => u.Campus).FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new KeyNotFoundException("User not found.");

        if (target.CampusId.HasValue && target.CampusId != actorCampusId)
            throw new UnauthorizedAccessException("Cannot modify users belonging to another campus.");

        if (request.CampusId.HasValue && request.CampusId != actorCampusId)
            throw new UnauthorizedAccessException("Campus Head can only assign members to their own campus.");

        target.CampusId = actorCampusId;
        target.Role = request.Role;
        target.Department = request.Role switch
        {
            UserRole.CampusHead or UserRole.Deputy or UserRole.Unassigned => Department.None,
            UserRole.EventsHead => Department.Events,
            UserRole.ClubsHead => Department.Clubs,
            UserRole.MarketingHead => Department.Marketing,
            _ => request.Department
        };
        target.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        await _db.Entry(target).Reference(u => u.Campus).LoadAsync(ct);
        return Ok(ToDto(target));
    }

    private static UserProfileDto ToDto(User u) => new(
        u.Id,
        u.Email,
        u.FullName,
        u.CampusId,
        u.Campus?.Name,
        u.Role.ToString(),
        u.Department.ToString(),
        u.IsActive);
}
