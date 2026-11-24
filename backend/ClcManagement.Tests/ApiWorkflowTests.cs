using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ClcManagement.Api.Application.DTOs;
using ClcManagement.Api.Domain;
using ClcManagement.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace ClcManagement.Tests;

public class ClcWebAppFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"ClcTestDb_{Guid.NewGuid():N}";
    private readonly string _tempUploadRoot = Path.Combine(Path.GetTempPath(), $"clc_test_uploads_{Guid.NewGuid():N}");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Storage:RootPath"] = _tempUploadRoot
            });
        });
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            var efConfigDescriptors = services
                .Where(d => d.ServiceType.IsGenericType &&
                            d.ServiceType.GetGenericTypeDefinition().Name.StartsWith("IDbContextOptionsConfiguration"))
                .ToList();
            foreach (var d in efConfigDescriptors) services.Remove(d);
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && Directory.Exists(_tempUploadRoot))
        {
            try { Directory.Delete(_tempUploadRoot, recursive: true); } catch { }
        }
    }
}

public class ApiWorkflowTests : IClassFixture<ClcWebAppFactory>
{
    private readonly ClcWebAppFactory _factory;

    private static readonly byte[] ValidPngBytes =
    [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01
    ];

    public ApiWorkflowTests(ClcWebAppFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClientAs(string? email = null)
    {
        var client = _factory.CreateClient();
        if (!string.IsNullOrWhiteSpace(email))
        {
            client.DefaultRequestHeaders.Add("X-Dev-User-Email", email);
        }
        return client;
    }

    private async Task<UserProfileDto> SignUpAndPromoteAsync(
        string fullName,
        string email,
        Guid campusId,
        UserRole role,
        Department department)
    {
        var anon = CreateClientAs();
        var signUpRes = await anon.PostAsJsonAsync("/api/v1/auth/signup", new SignUpRequest(fullName, email, campusId));
        UserProfileDto user;
        if (signUpRes.IsSuccessStatusCode)
        {
            user = (await signUpRes.Content.ReadFromJsonAsync<UserProfileDto>())!;
        }
        else
        {
            user = (await CreateClientAs(email).GetFromJsonAsync<UserProfileDto>("/api/v1/auth/me"))!;
        }

        var admin = CreateClientAs(DbSeeder.AdminEmail);
        var promoRes = await admin.PatchAsJsonAsync($"/api/v1/users/{user.Id}/role",
            new UpdateUserRoleRequest(role, department, campusId));
        promoRes.EnsureSuccessStatusCode();
        return (await promoRes.Content.ReadFromJsonAsync<UserProfileDto>())!;
    }

    [Fact]
    public async Task TC01_InitialSeed_HasThreeBelgiumCampusCampuses_SingleAdmin_AndPublicLandingAccess()
    {
        var anon = CreateClientAs();
        var healthRes = await anon.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, healthRes.StatusCode);

        // Anonymous visitor can load the 3 Belgium Campus iTversity campuses
        var campuses = await anon.GetFromJsonAsync<List<CampusDto>>("/api/v1/campuses");
        Assert.NotNull(campuses);
        Assert.Equal(3, campuses!.Count);
        Assert.Contains(campuses, c => c.Code == "PTA" && c.Name.Contains("Pretoria"));
        Assert.Contains(campuses, c => c.Code == "KMP" && c.Name.Contains("Kempton Park"));
        Assert.Contains(campuses, c => c.Code == "STB" && c.Name.Contains("Stellenbosch"));

        // Anonymous request to protected endpoint returns 401
        var unauthRes = await anon.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthRes.StatusCode);

        // Admin account resolves cleanly
        var admin = CreateClientAs(DbSeeder.AdminEmail);
        var profile = await admin.GetFromJsonAsync<UserProfileDto>("/api/v1/auth/me");
        Assert.NotNull(profile);
        Assert.Equal("Admin", profile!.Role);
        Assert.Equal("Shaun van der Bijl", profile.FullName);
    }

    [Fact]
    public async Task TC02_CrossCampusProposalReview_IsBlockedWithForbidden()
    {
        await SignUpAndPromoteAsync("PTA Events Head", "pta.events@bc.test", DbSeeder.PretoriaCampusId, UserRole.EventsHead, Department.Events);
        await SignUpAndPromoteAsync("STB Campus Head", "stb.head@bc.test", DbSeeder.StellenboschCampusId, UserRole.CampusHead, Department.None);

        var ptaEvents = CreateClientAs("pta.events@bc.test");
        var createRes = await ptaEvents.PostAsJsonAsync("/api/v1/proposals", new CreateProposalRequest(
            ProposalType.Event,
            "Pretoria Tech Expo",
            "Should only be reviewable by Pretoria Leadership or Admin.",
            DateTime.UtcNow.AddDays(15),
            DateTime.UtcNow.AddDays(15).AddHours(3),
            "Pretoria Auditorium",
            null, null, null));
        createRes.EnsureSuccessStatusCode();
        var created = await createRes.Content.ReadFromJsonAsync<ProposalDto>();

        var stbHead = CreateClientAs("stb.head@bc.test");
        var reviewRes = await stbHead.PostAsJsonAsync($"/api/v1/proposals/{created!.Id}/review",
            new ReviewProposalRequest(ReviewDecision.Approved, "Cross-campus attempt"));
        Assert.Equal(HttpStatusCode.Forbidden, reviewRes.StatusCode);
    }

    [Fact]
    public async Task TC03_AdminCanPromoteAnyRoleAcrossCampuses_WhileCampusHeadIsScoped()
    {
        var ptaHead = await SignUpAndPromoteAsync("PTA Head", "pta.head@bc.test", DbSeeder.PretoriaCampusId, UserRole.CampusHead, Department.None);
        var kmpMember = await SignUpAndPromoteAsync("KMP Member", "kmp.member@bc.test", DbSeeder.KemptonParkCampusId, UserRole.DepartmentMember, Department.Clubs);

        // Pretoria Campus Head can ONLY see Pretoria students in /api/v1/users
        var ptaHeadClient = CreateClientAs(ptaHead.Email);
        var ptaVisibleUsers = await ptaHeadClient.GetFromJsonAsync<List<UserProfileDto>>("/api/v1/users");
        Assert.DoesNotContain(ptaVisibleUsers!, u => u.CampusName == "Kempton Park Campus");

        // Pretoria Campus Head cannot modify Kempton Park member -> 403
        var crossAttempt = await ptaHeadClient.PatchAsJsonAsync($"/api/v1/users/{kmpMember.Id}/role",
            new UpdateUserRoleRequest(UserRole.ClubsHead, Department.Clubs, DbSeeder.KemptonParkCampusId));
        Assert.Equal(HttpStatusCode.Forbidden, crossAttempt.StatusCode);

        // Deputy can update home-campus member but NOT cross-campus member
        var ptaDeputy = await SignUpAndPromoteAsync("PTA Deputy", "pta.deputy@bc.test", DbSeeder.PretoriaCampusId, UserRole.Deputy, Department.None);
        var ptaStudent = await SignUpAndPromoteAsync("PTA Student", "pta.student@bc.test", DbSeeder.PretoriaCampusId, UserRole.Unassigned, Department.None);
        var deputyClient = CreateClientAs(ptaDeputy.Email);
        var deputyHomePromo = await deputyClient.PatchAsJsonAsync($"/api/v1/users/{ptaStudent.Id}/role",
            new UpdateUserRoleRequest(UserRole.DepartmentMember, Department.Events, DbSeeder.PretoriaCampusId));
        deputyHomePromo.EnsureSuccessStatusCode();
        var deputyCrossAttempt = await deputyClient.PatchAsJsonAsync($"/api/v1/users/{kmpMember.Id}/role",
            new UpdateUserRoleRequest(UserRole.DepartmentMember, Department.Events, DbSeeder.KemptonParkCampusId));
        Assert.Equal(HttpStatusCode.Forbidden, deputyCrossAttempt.StatusCode);

        // Pretoria Campus Head cannot promote anyone to Admin -> 403
        var adminAttempt = await ptaHeadClient.PatchAsJsonAsync($"/api/v1/users/{ptaHead.Id}/role",
            new UpdateUserRoleRequest(UserRole.Admin, Department.None, DbSeeder.PretoriaCampusId));
        Assert.Equal(HttpStatusCode.Forbidden, adminAttempt.StatusCode);

        // Global Admin CAN promote Kempton Park member to Stellenbosch Deputy -> 200
        var admin = CreateClientAs(DbSeeder.AdminEmail);
        var adminPromo = await admin.PatchAsJsonAsync($"/api/v1/users/{kmpMember.Id}/role",
            new UpdateUserRoleRequest(UserRole.Deputy, Department.None, DbSeeder.StellenboschCampusId));
        adminPromo.EnsureSuccessStatusCode();
        var updated = await adminPromo.Content.ReadFromJsonAsync<UserProfileDto>();
        Assert.Equal("Deputy", updated!.Role);
        Assert.Equal("Stellenbosch Campus", updated.CampusName);
    }

    [Fact]
    public async Task TC04_ProposalStateMachine_RequiresCommentOnChangesRequested_AndAutoCreatesClubOnApproval()
    {
        var clubsHead = await SignUpAndPromoteAsync("PTA Clubs Head", "pta.clubs@bc.test", DbSeeder.PretoriaCampusId, UserRole.ClubsHead, Department.Clubs);
        var ptaHead = await SignUpAndPromoteAsync("PTA Head 2", "pta.head2@bc.test", DbSeeder.PretoriaCampusId, UserRole.CampusHead, Department.None);

        var clubsClient = CreateClientAs(clubsHead.Email);
        var headClient = CreateClientAs(ptaHead.Email);

        var createRes = await clubsClient.PostAsJsonAsync("/api/v1/proposals", new CreateProposalRequest(
            ProposalType.Club,
            "BC Robotics & AI Guild",
            "Student robotics and machine learning society.",
            null, null, null,
            clubsHead.Id, null, null));
        createRes.EnsureSuccessStatusCode();
        var proposal = await createRes.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.Equal("Pending", proposal!.Status);

        var badReview = await headClient.PostAsJsonAsync($"/api/v1/proposals/{proposal.Id}/review",
            new ReviewProposalRequest(ReviewDecision.ChangesRequested, ""));
        Assert.Equal(HttpStatusCode.BadRequest, badReview.StatusCode);

        var changesRes = await headClient.PostAsJsonAsync($"/api/v1/proposals/{proposal.Id}/review",
            new ReviewProposalRequest(ReviewDecision.ChangesRequested, "Add lab schedule."));
        changesRes.EnsureSuccessStatusCode();

        var resubmitRes = await clubsClient.PutAsJsonAsync($"/api/v1/proposals/{proposal.Id}/resubmit",
            new ResubmitProposalRequest(
                "BC Robotics & AI Guild",
                "Student robotics society. Meets Wednesdays 16:00.",
                null, null, null, clubsHead.Id, null, null));
        resubmitRes.EnsureSuccessStatusCode();

        var approveRes = await headClient.PostAsJsonAsync($"/api/v1/proposals/{proposal.Id}/review",
            new ReviewProposalRequest(ReviewDecision.Approved, "Approved."));
        approveRes.EnsureSuccessStatusCode();

        var clubs = await clubsClient.GetFromJsonAsync<List<ClubDto>>("/api/v1/clubs");
        Assert.Contains(clubs!, c => c.Name == "BC Robotics & AI Guild");
    }

    [Fact]
    public async Task TC05_MarketingProposalAndPosterUpload_ValidatesMagicBytesAndRole()
    {
        var eventsHead = await SignUpAndPromoteAsync("KMP Events Head", "kmp.events@bc.test", DbSeeder.KemptonParkCampusId, UserRole.EventsHead, Department.Events);
        var mktHead = await SignUpAndPromoteAsync("KMP Mkt Head", "kmp.mkt@bc.test", DbSeeder.KemptonParkCampusId, UserRole.MarketingHead, Department.Marketing);

        var eventsClient = CreateClientAs(eventsHead.Email);
        var mktClient = CreateClientAs(mktHead.Email);

        var evRes = await eventsClient.PostAsJsonAsync("/api/v1/events", new CreateEventRequest(
            null, "Kempton Hackathon", "24h code sprint.", "Studio A",
            DateTime.UtcNow.AddDays(6), DateTime.UtcNow.AddDays(6).AddHours(6)));
        evRes.EnsureSuccessStatusCode();
        var targetEvent = (await evRes.Content.ReadFromJsonAsync<EventDto>())!;

        var propRes = await mktClient.PostAsJsonAsync("/api/v1/proposals", new CreateProposalRequest(
            ProposalType.Marketing, "Hackathon Poster Rollout", "Campus digital screens.",
            null, null, null, null, targetEvent.Id, null));
        Assert.Equal(HttpStatusCode.Created, propRes.StatusCode);

        using var forbiddenForm = CreateImageForm(ValidPngBytes, "poster.png", "image/png");
        var forbiddenUpload = await eventsClient.PostAsync($"/api/v1/events/{targetEvent.Id}/posters", forbiddenForm);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenUpload.StatusCode);

        using var spoofedForm = CreateImageForm("not-a-real-png-file-at-all"u8.ToArray(), "fake.png", "image/png");
        var spoofedUpload = await mktClient.PostAsync($"/api/v1/events/{targetEvent.Id}/posters", spoofedForm);
        Assert.Equal(HttpStatusCode.BadRequest, spoofedUpload.StatusCode);

        using var validForm = CreateImageForm(ValidPngBytes, "hackathon.png", "image/png");
        var validUpload = await mktClient.PostAsync($"/api/v1/events/{targetEvent.Id}/posters", validForm);
        validUpload.EnsureSuccessStatusCode();
        var uploadedPoster = await validUpload.Content.ReadFromJsonAsync<EventPosterDto>();
        Assert.StartsWith("/uploads/posters/", uploadedPoster!.Url);
    }

    [Fact]
    public async Task TC06_EventConflictCheck_AndPublicCampusActivityFeed()
    {
        var stbEvents = await SignUpAndPromoteAsync("STB Events Head", "stb.events@bc.test", DbSeeder.StellenboschCampusId, UserRole.EventsHead, Department.Events);
        var client = CreateClientAs(stbEvents.Email);

        var start = DateTime.UtcNow.AddDays(9);
        var end = start.AddHours(4);
        var evRes = await client.PostAsJsonAsync("/api/v1/events", new CreateEventRequest(
            null, "Stellenbosch Cyber Summit", "Security talks and CTF.", "Distillery Hall", start, end));
        evRes.EnsureSuccessStatusCode();

        var query = $"/api/v1/events/conflicts?startAt={Uri.EscapeDataString(start.AddMinutes(30).ToString("O"))}&endAt={Uri.EscapeDataString(end.AddMinutes(30).ToString("O"))}&venue=Distillery+Hall";
        var conflictRes = await client.GetFromJsonAsync<ConflictCheckResponse>(query);
        Assert.True(conflictRes!.HasConflict);
        Assert.Contains(conflictRes.Conflicts, c => c.ConflictType == "VenueAndTimeOverlap");

        // Anonymous visitor clicking Stellenbosch campus sees this confirmed event
        var anon = CreateClientAs();
        var stbPublic = await anon.GetFromJsonAsync<List<PublicCampusEventDto>>(
            $"/api/v1/cross-campus/events?campusId={DbSeeder.StellenboschCampusId}");
        Assert.Contains(stbPublic!, e => e.Title == "Stellenbosch Cyber Summit" && e.CampusName == "Stellenbosch Campus");
    }

    [Fact]
    public async Task TC07_TasksMeetingsNotificationsHistory_And500msLatency()
    {
        var ptaHead = await SignUpAndPromoteAsync("PTA Head 3", "pta.head3@bc.test", DbSeeder.PretoriaCampusId, UserRole.CampusHead, Department.None);
        var ptaEvents = await SignUpAndPromoteAsync("PTA Events 2", "pta.events2@bc.test", DbSeeder.PretoriaCampusId, UserRole.EventsHead, Department.Events);
        var ptaMember = await SignUpAndPromoteAsync("PTA Member", "pta.member@bc.test", DbSeeder.PretoriaCampusId, UserRole.DepartmentMember, Department.Events);

        var headClient = CreateClientAs(ptaHead.Email);
        var eventsClient = CreateClientAs(ptaEvents.Email);
        var memberClient = CreateClientAs(ptaMember.Email);

        // Schedule meeting with Teams link -> notification -> post recording & transcript
        var mtgRes = await headClient.PostAsJsonAsync("/api/v1/meetings", new CreateMeetingRequest(
            "CLC Quarterly Sync", "Review campus calendars.", "Microsoft Teams",
            DateTime.UtcNow.AddDays(3), DateTime.UtcNow.AddDays(3).AddHours(1),
            "https://teams.microsoft.com/l/meetup-join/example-sync"));
        Assert.Equal(HttpStatusCode.Created, mtgRes.StatusCode);
        var mtg = (await mtgRes.Content.ReadFromJsonAsync<MeetingDto>())!;
        Assert.Contains("teams.microsoft.com", mtg.TeamsJoinUrl);

        var artifactsRes = await headClient.PatchAsJsonAsync($"/api/v1/meetings/{mtg.Id}/artifacts",
            new UpdateMeetingArtifactsRequest(
                mtg.TeamsJoinUrl,
                "https://belgiumcampus.sharepoint.com/recordings/clc-sync.mp4",
                null,
                "00:00:01 Nadia: Welcome to the CLC Quarterly Sync."));
        artifactsRes.EnsureSuccessStatusCode();
        var syncedMtg = (await artifactsRes.Content.ReadFromJsonAsync<MeetingDto>())!;
        Assert.NotNull(syncedMtg.SummarySyncedAt);
        Assert.Contains("Quarterly Sync", syncedMtg.TranscriptText);

        // Assign task -> notification -> Done -> ActivityLog
        var taskRes = await eventsClient.PostAsJsonAsync("/api/v1/tasks", new CreateTaskRequest(
            null, ptaMember.Id, "Setup Registration Desk", "Prepare badges and laptops.", TaskPriority.High, DateTime.UtcNow.AddDays(2)));
        Assert.Equal(HttpStatusCode.Created, taskRes.StatusCode);
        var task = (await taskRes.Content.ReadFromJsonAsync<WorkTaskDto>())!;

        var feed = await memberClient.GetFromJsonAsync<NotificationFeedDto>("/api/v1/notifications");
        Assert.Contains(feed!.Items, n => n.Type == "MeetingScheduled");
        Assert.Contains(feed.Items, n => n.Type == "TaskAssigned");

        var doneRes = await memberClient.PatchAsJsonAsync($"/api/v1/tasks/{task.Id}/status",
            new UpdateTaskStatusRequest(WorkTaskStatus.Done, 1));
        doneRes.EnsureSuccessStatusCode();

        var history = await eventsClient.GetFromJsonAsync<List<ActivityLogDto>>("/api/v1/history?department=Events");
        Assert.Contains(history!, h => h.ActionType == "TaskCompleted" && h.Summary.Contains("Setup Registration Desk"));

        // Latency < 500 ms (NFR-06)
        var sw = Stopwatch.StartNew();
        (await eventsClient.GetAsync("/api/v1/calendar/campus")).EnsureSuccessStatusCode();
        (await eventsClient.GetAsync("/api/v1/proposals")).EnsureSuccessStatusCode();
        (await eventsClient.GetAsync("/api/v1/tasks")).EnsureSuccessStatusCode();
        sw.Stop();
        Assert.True(sw.Elapsed.TotalMilliseconds / 3.0 < 500);
    }

    [Fact]
    public async Task TC08_ClubDetails_ClubShowcaseEvent_AndMarketingWhatsAppCampaign_WorkEndToEnd()
    {
        var clubsHead = await SignUpAndPromoteAsync("PTA Clubs 2", "pta.clubs2@bc.test", DbSeeder.PretoriaCampusId, UserRole.ClubsHead, Department.Clubs);
        var mktHead = await SignUpAndPromoteAsync("PTA Mkt 2", "pta.mkt2@bc.test", DbSeeder.PretoriaCampusId, UserRole.MarketingHead, Department.Marketing);

        var clubsClient = CreateClientAs(clubsHead.Email);
        var mktClient = CreateClientAs(mktHead.Email);

        // Register club with full details + non-CLC Club Head text name
        var clubRes = await clubsClient.PostAsJsonAsync("/api/v1/clubs", new CreateClubRequest(
            "Robotics Club",
            "Autonomous robotics engineering society.",
            "Build and program competition robots.",
            "Wednesdays 16:00 - 17:30",
            "Robotics Lab B2",
            "Jaco Pietersen"));
        Assert.Equal(HttpStatusCode.Created, clubRes.StatusCode);
        var club = (await clubRes.Content.ReadFromJsonAsync<ClubDto>())!;
        Assert.Equal("Robotics Lab B2", club.MeetingLocation);
        Assert.Equal("Jaco Pietersen", club.ClubHeadName);

        // Clubs dept publishes a Club Showcase Event
        var evRes = await clubsClient.PostAsJsonAsync("/api/v1/events", new CreateEventRequest(
            null,
            "Robotics Club Showcase",
            "Live robot demos by students.",
            "Innovation Hall",
            DateTime.UtcNow.AddDays(8),
            DateTime.UtcNow.AddDays(8).AddHours(3),
            club.Id));
        Assert.Equal(HttpStatusCode.Created, evRes.StatusCode);
        var clubEvent = (await evRes.Content.ReadFromJsonAsync<EventDto>())!;
        Assert.Equal("Robotics Club", clubEvent.ClubName);

        // Marketing submits campaign with WhatsApp promo message
        var mktRes = await mktClient.PostAsJsonAsync("/api/v1/proposals", new CreateProposalRequest(
            ProposalType.Marketing,
            "Robotics Showcase Campaign",
            "Posters and WhatsApp group promo.",
            null, null, null, null,
            clubEvent.Id, club.Id,
            WhatsAppMessage: "Join the Robotics Club Showcase this Friday at Innovation Hall!"));
        Assert.Equal(HttpStatusCode.Created, mktRes.StatusCode);
        var mktProp = (await mktRes.Content.ReadFromJsonAsync<ProposalDto>())!;
        Assert.Contains("Innovation Hall", mktProp.WhatsAppMessage);
    }

    private static MultipartFormDataContent CreateImageForm(byte[] bytes, string fileName, string contentType)
    {
        var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(content, "file", fileName);
        return form;
    }
}
