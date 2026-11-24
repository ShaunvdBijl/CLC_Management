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

    [HttpPost("auth/signup")]
    [AllowAnonymous]
    public async Task<ActionResult<UserProfileDto>> SignUp([FromBody] SignUpRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Full name and email are required.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (!normalizedEmail.Contains('@'))
            throw new ArgumentException("Please enter a valid email address.");

        var existing = await _db.Users.Include(u => u.Campus)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, ct);

        if (existing is not null)
            throw new InvalidOperationException("An account with this email already exists. Please log in instead.");

        var user = new User
        {
            EntraObjectId = $"dev-oid:{normalizedEmail}",
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            CampusId = request.PreferredCampusId,
            Role = UserRole.Unassigned,
            Department = Department.None,
            IsActive = true
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        if (user.CampusId.HasValue)
            await _db.Entry(user).Reference(u => u.Campus).LoadAsync(ct);

        return CreatedAtAction(nameof(GetMe), ToDto(user));
    }

    [HttpGet("auth/dev-users")]
    [AllowAnonymous]
    public async Task<ActionResult<List<UserProfileDto>>> GetDevUsers(CancellationToken ct)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var users = await _db.Users.AsNoTracking()
            .Include(u => u.Campus)
            .OrderBy(u => u.Role == UserRole.Admin ? 0 : 1)
            .ThenBy(u => u.CampusId)
            .ThenBy(u => u.FullName)
            .ToListAsync(ct);

        return Ok(users.Select(ToDto).ToList());
    }

    [HttpGet("campuses")]
    [AllowAnonymous]
    public async Task<ActionResult<List<CampusDto>>> GetCampuses(CancellationToken ct)
    {
        var campuses = await _db.Campuses.AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CampusDto(
                c.Id,
                c.Name,
                c.Code,
                c.Address,
                c.Province,
                c.ImageUrl,
                c.Description,
                c.Events.Count(e => e.Status == EventStatus.Confirmed)))
            .ToListAsync(ct);

        return Ok(campuses);
    }

    [HttpGet("users")]
    public async Task<ActionResult<List<UserProfileDto>>> GetUsers(
        [FromQuery] Department? department,
        [FromQuery] UserRole? role,
        [FromQuery] Guid? campusId,
        [FromQuery] bool unassigned = false,
        CancellationToken ct = default)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (!actor.IsLeadership() && !actor.IsDepartmentHead())
            throw new UnauthorizedAccessException("Only Admins, Campus Leadership, or Department Heads can view the user roster.");

        IQueryable<User> query = _db.Users.AsNoTracking().Include(u => u.Campus);

        if (actor.IsAdmin())
        {
            if (unassigned)
                query = query.Where(u => u.Role == UserRole.Unassigned || u.CampusId == null);
            else if (campusId.HasValue)
                query = query.Where(u => u.CampusId == campusId.Value);
        }
        else
        {
            // Campus Head, Deputy, and Dept Heads can ONLY see students/members from their own campus
            var actorCampusId = actor.RequireCampusId();
            query = query.Where(u => u.CampusId == actorCampusId);

            if (unassigned)
            {
                if (!actor.IsLeadership())
                    throw new UnauthorizedAccessException("Only Admins, Campus Head, or Deputy can view unassigned users.");
                query = query.Where(u => u.Role == UserRole.Unassigned);
            }
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
        if (!actor.IsAdmin() && actor.Role != UserRole.CampusHead && actor.Role != UserRole.Deputy)
            throw new UnauthorizedAccessException("Only an Admin, Campus Head, or Deputy can promote, demote, or transfer members.");

        var target = await _db.Users.Include(u => u.Campus).FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new KeyNotFoundException("User not found.");

        if (actor.IsAdmin())
        {
            if (request.CampusId.HasValue)
            {
                var campusExists = await _db.Campuses.AnyAsync(c => c.Id == request.CampusId.Value, ct);
                if (!campusExists)
                    throw new ArgumentException("Selected campus does not exist.");
                target.CampusId = request.CampusId.Value;
            }
            target.Role = request.Role;
            target.Department = request.Role switch
            {
                UserRole.Admin or UserRole.CampusHead or UserRole.Deputy or UserRole.Unassigned => Department.None,
                UserRole.EventsHead => Department.Events,
                UserRole.ClubsHead => Department.Clubs,
                UserRole.MarketingHead => Department.Marketing,
                _ => request.Department
            };
        }
        else
        {
            // CampusHead and Deputy can ONLY update students/members from their own campus and cannot assign Admin
            if (request.Role == UserRole.Admin || target.Role == UserRole.Admin)
                throw new UnauthorizedAccessException("Only a global Admin can assign or modify the Admin role.");

            var actorCampusId = actor.RequireCampusId();
            if (target.CampusId != actorCampusId)
                throw new UnauthorizedAccessException("Campus Head / Deputy can only update student roles from their own campus.");

            if (request.CampusId.HasValue && request.CampusId != actorCampusId)
                throw new UnauthorizedAccessException("Campus Head / Deputy cannot move students to another campus.");

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
        }

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
