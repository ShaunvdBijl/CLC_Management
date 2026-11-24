using System.Security.Claims;
using ClcManagement.Api.Domain;
using ClcManagement.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClcManagement.Api.Application.Auth;

public interface ICurrentUserService
{
    Task<User?> GetOrProvisionUserAsync(ClaimsPrincipal principal, CancellationToken ct = default);
    Task<User> RequireCurrentUserAsync(ClaimsPrincipal principal, CancellationToken ct = default);
}

public class CurrentUserService : ICurrentUserService
{
    private readonly AppDbContext _db;

    public CurrentUserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<User?> GetOrProvisionUserAsync(ClaimsPrincipal principal, CancellationToken ct = default)
    {
        var oid = principal.FindFirst("oid")?.Value
            ?? principal.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var email = principal.FindFirst(ClaimTypes.Email)?.Value
            ?? principal.FindFirst("preferred_username")?.Value
            ?? principal.FindFirst("upn")?.Value;

        if (string.IsNullOrWhiteSpace(oid) && string.IsNullOrWhiteSpace(email))
            return null;

        User? user = null;
        if (!string.IsNullOrWhiteSpace(oid))
        {
            user = await _db.Users.Include(u => u.Campus)
                .FirstOrDefaultAsync(u => u.EntraObjectId == oid, ct);
        }

        if (user is null && !string.IsNullOrWhiteSpace(email))
        {
            user = await _db.Users.Include(u => u.Campus)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), ct);

            if (user is not null && !string.IsNullOrWhiteSpace(oid) && !oid.StartsWith("dev-oid:", StringComparison.Ordinal))
            {
                user.EntraObjectId = oid;
                user.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
            }
        }

        if (user is null && !string.IsNullOrWhiteSpace(email))
        {
            var displayName = principal.FindFirst("name")?.Value ?? email.Split('@')[0];
            user = new User
            {
                EntraObjectId = oid ?? Guid.NewGuid().ToString("D"),
                Email = email.ToLowerInvariant(),
                FullName = displayName,
                Role = UserRole.Unassigned,
                Department = Department.None,
                IsActive = true
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync(ct);
        }

        return user;
    }

    public async Task<User> RequireCurrentUserAsync(ClaimsPrincipal principal, CancellationToken ct = default)
    {
        var user = await GetOrProvisionUserAsync(principal, ct);
        return user ?? throw new UnauthorizedAccessException("Unable to resolve authenticated CLC user.");
    }
}

public static class UserPermissionExtensions
{
    public static bool IsLeadership(this User user) =>
        user.Role is UserRole.CampusHead or UserRole.Deputy;

    public static bool IsDepartmentHead(this User user) =>
        user.Role is UserRole.EventsHead or UserRole.ClubsHead or UserRole.MarketingHead;

    public static bool CanManageDepartment(this User user, Department dept) =>
        (user.Role == UserRole.EventsHead && dept == Department.Events) ||
        (user.Role == UserRole.ClubsHead && dept == Department.Clubs) ||
        (user.Role == UserRole.MarketingHead && dept == Department.Marketing);

    public static bool BelongsToDepartment(this User user, Department dept) =>
        user.Department == dept && user.Role != UserRole.Unassigned;

    public static Guid RequireCampusId(this User user) =>
        user.CampusId ?? throw new UnauthorizedAccessException("Your account has not been assigned to a campus yet.");
}
