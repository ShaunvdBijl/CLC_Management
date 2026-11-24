using ClcManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClcManagement.Api.Infrastructure.Data;

public static class DbSeeder
{
    public static readonly Guid PretoriaCampusId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid KemptonParkCampusId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid StellenboschCampusId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    public static readonly Guid AdminUserId = Guid.Parse("10000000-0000-0000-0000-000000000001");
    public const string AdminEmail = "shaunvdbijl@gmail.com";

    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (!await db.Campuses.AnyAsync(ct))
        {
            db.Campuses.AddRange(
                new Campus
                {
                    Id = PretoriaCampusId,
                    Name = "Pretoria Campus",
                    Code = "PTA",
                    Address = "138 Berg Avenue, Pretoria North",
                    Province = "Gauteng",
                    ImageUrl = "https://www.belgiumcampus.ac.za/wp-content/uploads/2024/10/Pretoria-Campus_0029_Background-768x512.png",
                    Description = "Flagship headquarters in Pretoria North featuring hybrid IT lecture halls, robotics labs, student residences, and CLC operations."
                },
                new Campus
                {
                    Id = KemptonParkCampusId,
                    Name = "Kempton Park Campus",
                    Code = "KMP",
                    Address = "45 A Long Street, Kempton Park",
                    Province = "Gauteng",
                    ImageUrl = "https://www.belgiumcampus.ac.za/wp-content/uploads/2026/08/Kempton-Park-Campus-001-1024x683.webp",
                    Description = "Ekurhuleni innovation hub with collaborative coding studios, tech classrooms, and active student leadership societies."
                },
                new Campus
                {
                    Id = StellenboschCampusId,
                    Name = "Stellenbosch Campus",
                    Code = "STB",
                    Address = "10 Distillery Road, Stellenbosch",
                    Province = "Western Cape",
                    ImageUrl = "https://www.belgiumcampus.ac.za/wp-content/uploads/2022/09/1958651_H_1-1024x682.jpg",
                    Description = "Western Cape tech campus set in the heart of Stellenbosch, connecting future software engineers and campus leaders."
                }
            );
        }

        // Seed ONLY the single Admin account (no preset dummy events, clubs, proposals, tasks, or meetings)
        if (!await db.Users.AnyAsync(ct))
        {
            db.Users.Add(new User
            {
                Id = AdminUserId,
                EntraObjectId = $"dev-oid:{AdminEmail}",
                Email = AdminEmail,
                FullName = "Shaun van der Bijl",
                CampusId = PretoriaCampusId,
                Role = UserRole.Admin,
                Department = Department.None,
                IsActive = true
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
