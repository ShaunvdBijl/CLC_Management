using ClcManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClcManagement.Api.Infrastructure.Data;

public static class DbSeeder
{
    public static readonly Guid MainCampusId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid NorthCampusId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.Campuses.AnyAsync(ct))
        {
            return;
        }

        var mainCampus = new Campus { Id = MainCampusId, Name = "Main Campus", Code = "MAIN" };
        var northCampus = new Campus { Id = NorthCampusId, Name = "North Campus", Code = "NORTH" };
        db.Campuses.AddRange(mainCampus, northCampus);

        var mainHead = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000001"),
            EntraObjectId = "dev-main-head",
            Email = "campus.head@main.clc.edu",
            FullName = "Nadia Mokoena",
            CampusId = MainCampusId,
            Role = UserRole.CampusHead,
            Department = Department.None
        };
        var mainDeputy = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000002"),
            EntraObjectId = "dev-main-deputy",
            Email = "deputy@main.clc.edu",
            FullName = "Liam van der Merwe",
            CampusId = MainCampusId,
            Role = UserRole.Deputy,
            Department = Department.None
        };
        var mainEventsHead = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000003"),
            EntraObjectId = "dev-main-events-head",
            Email = "events.head@main.clc.edu",
            FullName = "Thabo Dlamini",
            CampusId = MainCampusId,
            Role = UserRole.EventsHead,
            Department = Department.Events
        };
        var mainClubsHead = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000004"),
            EntraObjectId = "dev-main-clubs-head",
            Email = "clubs.head@main.clc.edu",
            FullName = "Aisha Patel",
            CampusId = MainCampusId,
            Role = UserRole.ClubsHead,
            Department = Department.Clubs
        };
        var mainMarketingHead = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000005"),
            EntraObjectId = "dev-main-marketing-head",
            Email = "marketing.head@main.clc.edu",
            FullName = "Chloe Naidoo",
            CampusId = MainCampusId,
            Role = UserRole.MarketingHead,
            Department = Department.Marketing
        };
        var mainEventsMember = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000006"),
            EntraObjectId = "dev-main-events-member",
            Email = "events.member@main.clc.edu",
            FullName = "Sipho Khumalo",
            CampusId = MainCampusId,
            Role = UserRole.DepartmentMember,
            Department = Department.Events
        };
        var northHead = new User
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000001"),
            EntraObjectId = "dev-north-head",
            Email = "campus.head@north.clc.edu",
            FullName = "Marcus Botha",
            CampusId = NorthCampusId,
            Role = UserRole.CampusHead,
            Department = Department.None
        };
        var northEventsHead = new User
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000002"),
            EntraObjectId = "dev-north-events-head",
            Email = "events.head@north.clc.edu",
            FullName = "Zanele Nkosi",
            CampusId = NorthCampusId,
            Role = UserRole.EventsHead,
            Department = Department.Events
        };

        db.Users.AddRange(
            mainHead, mainDeputy, mainEventsHead, mainClubsHead,
            mainMarketingHead, mainEventsMember, northHead, northEventsHead
        );

        var now = DateTime.UtcNow;

        var mainEvent = new CampusEvent
        {
            Id = Guid.Parse("30000000-0000-0000-0000-000000000001"),
            CampusId = MainCampusId,
            CreatedById = mainEventsHead.Id,
            Title = "End-of-Year Tech Showcase",
            Description = "Student software and hardware exhibition in the Main Hall.",
            Venue = "Main Hall",
            StartAt = now.Date.AddDays(5).AddHours(10),
            EndAt = now.Date.AddDays(5).AddHours(15),
            Status = EventStatus.Confirmed
        };

        var northEvent = new CampusEvent
        {
            Id = Guid.Parse("30000000-0000-0000-0000-000000000002"),
            CampusId = NorthCampusId,
            CreatedById = northEventsHead.Id,
            Title = "Annual Cultural Night",
            Description = "Cross-cultural music, food, and dance showcase.",
            Venue = "Student Center",
            StartAt = now.Date.AddDays(7).AddHours(18),
            EndAt = now.Date.AddDays(7).AddHours(21),
            Status = EventStatus.Confirmed
        };

        db.Events.AddRange(mainEvent, northEvent);

        db.Clubs.Add(new Club
        {
            CampusId = MainCampusId,
            Name = "Developer Student Club",
            Description = "Weekly coding workshops and hackathon prep.",
            ClubHeadId = mainClubsHead.Id
        });

        db.Proposals.Add(new Proposal
        {
            CampusId = MainCampusId,
            SubmittedById = mainEventsHead.Id,
            ProposalType = ProposalType.Event,
            Status = ProposalStatus.Pending,
            Title = "Summer Hackathon 2026",
            Description = "24-hour student innovation challenge across engineering and design.",
            ProposedStartAt = now.Date.AddDays(10).AddHours(9),
            ProposedEndAt = now.Date.AddDays(11).AddHours(9),
            ProposedVenue = "Main Hall"
        });

        db.Tasks.AddRange(
            new WorkTask
            {
                CampusId = MainCampusId,
                Department = Department.Events,
                EventId = mainEvent.Id,
                AssignedById = mainEventsHead.Id,
                AssignedToId = mainEventsMember.Id,
                Title = "Confirm PA System & Microphones",
                Description = "Coordinate with AV team for Main Hall setup.",
                Status = WorkTaskStatus.ToDo,
                Priority = TaskPriority.High,
                SortOrder = 1,
                DueAt = now.Date.AddDays(3)
            },
            new WorkTask
            {
                CampusId = MainCampusId,
                Department = Department.Events,
                EventId = mainEvent.Id,
                AssignedById = mainEventsHead.Id,
                AssignedToId = mainEventsMember.Id,
                Title = "Finalize Venue Security Roster",
                Description = "Submit guest count and marshal list to campus security.",
                Status = WorkTaskStatus.InProgress,
                Priority = TaskPriority.Critical,
                SortOrder = 1,
                DueAt = now.Date.AddDays(2)
            }
        );

        db.Meetings.Add(new Meeting
        {
            CampusId = MainCampusId,
            CreatedById = mainHead.Id,
            Title = "Monthly CLC Leadership Sync",
            Agenda = "Review Q4 proposals, upcoming events, and club budgets.",
            Location = "Boardroom 2B",
            StartAt = now.Date.AddDays(2).AddHours(14),
            EndAt = now.Date.AddDays(2).AddHours(15)
        });

        db.ActivityLogs.Add(new ActivityLog
        {
            CampusId = MainCampusId,
            Department = Department.Events,
            ActorId = mainEventsHead.Id,
            ActionType = "EventConfirmed",
            EntityType = "Event",
            EntityId = mainEvent.Id,
            Summary = "Confirmed event: End-of-Year Tech Showcase",
            OccurredAt = now.AddDays(-1)
        });

        await db.SaveChangesAsync(ct);
    }
}
