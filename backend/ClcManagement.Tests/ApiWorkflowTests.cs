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

    // Minimal valid 1x1 PNG header + bytes for poster upload verification
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

    private HttpClient CreateClientAs(string email)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Dev-User-Email", email);
        return client;
    }

    [Fact]
    public async Task TC01_HealthAndAuthProfile_ReturnsOk()
    {
        var client = CreateClientAs("campus.head@main.clc.edu");
        var healthRes = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, healthRes.StatusCode);

        var profile = await client.GetFromJsonAsync<UserProfileDto>("/api/v1/auth/me");
        Assert.NotNull(profile);
        Assert.Equal("Main Campus", profile!.CampusName);
        Assert.Equal("CampusHead", profile.Role);
    }

    [Fact]
    public async Task TC02_CrossCampusProposalReview_IsBlockedWithForbidden()
    {
        var mainEvents = CreateClientAs("events.head@main.clc.edu");
        var createRes = await mainEvents.PostAsJsonAsync("/api/v1/proposals", new CreateProposalRequest(
            ProposalType.Event,
            "Cross-Campus Test Event",
            "Should only be reviewable by Main Campus Leadership.",
            DateTime.UtcNow.AddDays(15),
            DateTime.UtcNow.AddDays(15).AddHours(3),
            "Auditorium A",
            null, null, null));
        createRes.EnsureSuccessStatusCode();
        var created = await createRes.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(created);

        var northHead = CreateClientAs("campus.head@north.clc.edu");
        var reviewRes = await northHead.PostAsJsonAsync($"/api/v1/proposals/{created!.Id}/review",
            new ReviewProposalRequest(ReviewDecision.Approved, "Unauthorized attempt"));
        Assert.Equal(HttpStatusCode.Forbidden, reviewRes.StatusCode);
    }

    [Fact]
    public async Task TC03_MemberRoleManagement_AllowsHomeCampusHead_BlocksCrossCampusAndNonHead()
    {
        var mainHead = CreateClientAs("campus.head@main.clc.edu");
        var deputy = CreateClientAs("deputy@main.clc.edu");
        var northHead = CreateClientAs("campus.head@north.clc.edu");

        var mainMember = await CreateClientAs("events.member@main.clc.edu")
            .GetFromJsonAsync<UserProfileDto>("/api/v1/auth/me");
        var northEventsHead = await CreateClientAs("events.head@north.clc.edu")
            .GetFromJsonAsync<UserProfileDto>("/api/v1/auth/me");

        // Deputy cannot promote/transfer members -> 403
        var deputyAttempt = await deputy.PatchAsJsonAsync($"/api/v1/users/{mainMember!.Id}/role",
            new UpdateUserRoleRequest(UserRole.DepartmentMember, Department.Clubs, null));
        Assert.Equal(HttpStatusCode.Forbidden, deputyAttempt.StatusCode);

        // Main Campus Head cannot modify North Campus member -> 403
        var crossCampusAttempt = await mainHead.PatchAsJsonAsync($"/api/v1/users/{northEventsHead!.Id}/role",
            new UpdateUserRoleRequest(UserRole.DepartmentMember, Department.Events, null));
        Assert.Equal(HttpStatusCode.Forbidden, crossCampusAttempt.StatusCode);

        // Main Campus Head can reassign home campus member -> 200
        var validTransfer = await mainHead.PatchAsJsonAsync($"/api/v1/users/{mainMember.Id}/role",
            new UpdateUserRoleRequest(UserRole.DepartmentMember, Department.Events, null));
        validTransfer.EnsureSuccessStatusCode();
        Assert.NotNull(northHead);
    }

    [Fact]
    public async Task TC04_ProposalStateMachine_RequiresCommentOnChangesRequested_AndAutoCreatesClubOnApproval()
    {
        var clubsHead = CreateClientAs("clubs.head@main.clc.edu");
        var campusHead = CreateClientAs("campus.head@main.clc.edu");

        var me = await clubsHead.GetFromJsonAsync<UserProfileDto>("/api/v1/auth/me");
        Assert.NotNull(me);

        var createRes = await clubsHead.PostAsJsonAsync("/api/v1/proposals", new CreateProposalRequest(
            ProposalType.Club,
            "AI & Robotics Club",
            "Student robotics and machine learning society.",
            null, null, null,
            me!.Id, null, null));
        createRes.EnsureSuccessStatusCode();
        var proposal = await createRes.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.Equal("Pending", proposal!.Status);

        var badReview = await campusHead.PostAsJsonAsync($"/api/v1/proposals/{proposal.Id}/review",
            new ReviewProposalRequest(ReviewDecision.ChangesRequested, ""));
        Assert.Equal(HttpStatusCode.BadRequest, badReview.StatusCode);

        var changesRes = await campusHead.PostAsJsonAsync($"/api/v1/proposals/{proposal.Id}/review",
            new ReviewProposalRequest(ReviewDecision.ChangesRequested, "Add faculty advisor details."));
        changesRes.EnsureSuccessStatusCode();
        var changed = await changesRes.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.Equal("ChangesRequested", changed!.Status);

        var resubmitRes = await clubsHead.PutAsJsonAsync($"/api/v1/proposals/{proposal.Id}/resubmit",
            new ResubmitProposalRequest(
                "AI & Robotics Club",
                "Student robotics society. Advisor: Dr. Dlamini.",
                null, null, null, me.Id, null, null));
        resubmitRes.EnsureSuccessStatusCode();
        var resubmitted = await resubmitRes.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.Equal("Pending", resubmitted!.Status);

        var approveRes = await campusHead.PostAsJsonAsync($"/api/v1/proposals/{proposal.Id}/review",
            new ReviewProposalRequest(ReviewDecision.Approved, "Looks great."));
        approveRes.EnsureSuccessStatusCode();

        var clubs = await clubsHead.GetFromJsonAsync<List<ClubDto>>("/api/v1/clubs");
        Assert.Contains(clubs!, c => c.Name == "AI & Robotics Club");
    }

    [Fact]
    public async Task TC05_MarketingProposalAndPosterUpload_ValidatesMagicBytesAndRole()
    {
        var marketingHead = CreateClientAs("marketing.head@main.clc.edu");
        var eventsHead = CreateClientAs("events.head@main.clc.edu");

        var events = await eventsHead.GetFromJsonAsync<List<EventDto>>("/api/v1/events");
        var targetEvent = events!.First();

        // Marketing submits proposal linked to event -> 201
        var propRes = await marketingHead.PostAsJsonAsync("/api/v1/proposals", new CreateProposalRequest(
            ProposalType.Marketing,
            "Tech Showcase Poster Campaign",
            "Campus screens and hallway posters.",
            null, null, null, null,
            targetEvent.Id, null));
        Assert.Equal(HttpStatusCode.Created, propRes.StatusCode);

        // Events Head attempting poster upload -> 403 Forbidden
        using var forbiddenForm = CreateImageForm(ValidPngBytes, "poster.png", "image/png");
        var forbiddenUpload = await eventsHead.PostAsync($"/api/v1/events/{targetEvent.Id}/posters", forbiddenForm);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenUpload.StatusCode);

        // Spoofed file claiming to be PNG -> 400 Bad Request
        using var spoofedForm = CreateImageForm("not-a-real-png-file-at-all"u8.ToArray(), "fake.png", "image/png");
        var spoofedUpload = await marketingHead.PostAsync($"/api/v1/events/{targetEvent.Id}/posters", spoofedForm);
        Assert.Equal(HttpStatusCode.BadRequest, spoofedUpload.StatusCode);

        // Valid PNG uploaded by Marketing -> 200 OK
        using var validForm = CreateImageForm(ValidPngBytes, "showcase.png", "image/png");
        var validUpload = await marketingHead.PostAsync($"/api/v1/events/{targetEvent.Id}/posters", validForm);
        validUpload.EnsureSuccessStatusCode();
        var uploadedPoster = await validUpload.Content.ReadFromJsonAsync<EventPosterDto>();
        Assert.NotNull(uploadedPoster);
        Assert.StartsWith("/uploads/posters/", uploadedPoster!.Url);
    }

    [Fact]
    public async Task TC06_EventConflictCheck_DetectsVenueAndTimeOverlap()
    {
        var eventsHead = CreateClientAs("events.head@main.clc.edu");
        var events = await eventsHead.GetFromJsonAsync<List<EventDto>>("/api/v1/events");
        var seeded = events!.First();

        var query = $"/api/v1/events/conflicts?startAt={Uri.EscapeDataString(seeded.StartAt.AddMinutes(30).ToString("O"))}&endAt={Uri.EscapeDataString(seeded.EndAt.AddMinutes(30).ToString("O"))}&venue={Uri.EscapeDataString(seeded.Venue)}";
        var conflictRes = await eventsHead.GetFromJsonAsync<ConflictCheckResponse>(query);

        Assert.NotNull(conflictRes);
        Assert.True(conflictRes!.HasConflict);
        Assert.Contains(conflictRes.Conflicts, c => c.ConflictType == "VenueAndTimeOverlap");
    }

    [Fact]
    public async Task TC07_CampusMeeting_TriggersInAppNotificationForCampusMembers()
    {
        var mainHead = CreateClientAs("campus.head@main.clc.edu");
        var member = CreateClientAs("events.member@main.clc.edu");

        var createRes = await mainHead.PostAsJsonAsync("/api/v1/meetings", new CreateMeetingRequest(
            "Q4 Evaluation Prep",
            "Align departmental history summaries.",
            "Senate Room",
            DateTime.UtcNow.AddDays(4),
            DateTime.UtcNow.AddDays(4).AddHours(1)));
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);

        var feed = await member.GetFromJsonAsync<NotificationFeedDto>("/api/v1/notifications");
        Assert.NotNull(feed);
        Assert.Contains(feed!.Items, n => n.Type == "MeetingScheduled" && n.Title.Contains("Q4 Evaluation Prep"));
    }

    [Fact]
    public async Task TC08_TaskAssignmentAndCompletion_NotifiesMemberAndLogsToQuarterlyHistory()
    {
        var eventsHead = CreateClientAs("events.head@main.clc.edu");
        var member = CreateClientAs("events.member@main.clc.edu");
        var memberProfile = await member.GetFromJsonAsync<UserProfileDto>("/api/v1/auth/me");

        var createRes = await eventsHead.PostAsJsonAsync("/api/v1/tasks", new CreateTaskRequest(
            null,
            memberProfile!.Id,
            "Verify Stage Lighting",
            "Test spotlights 24h before showcase.",
            TaskPriority.High,
            DateTime.UtcNow.AddDays(2)));
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var task = await createRes.Content.ReadFromJsonAsync<WorkTaskDto>();

        var feed = await member.GetFromJsonAsync<NotificationFeedDto>("/api/v1/notifications");
        Assert.Contains(feed!.Items, n => n.Type == "TaskAssigned" && n.Message.Contains("Verify Stage Lighting"));

        var doneRes = await member.PatchAsJsonAsync($"/api/v1/tasks/{task!.Id}/status",
            new UpdateTaskStatusRequest(WorkTaskStatus.Done, 1));
        doneRes.EnsureSuccessStatusCode();

        var history = await eventsHead.GetFromJsonAsync<List<ActivityLogDto>>("/api/v1/history?department=Events");
        Assert.Contains(history!, h => h.ActionType == "TaskCompleted" && h.Summary.Contains("Verify Stage Lighting"));
    }

    [Fact]
    public async Task TC09_CampusCalendar_AggregatesHomeEventsAndMeetings()
    {
        var member = CreateClientAs("events.member@main.clc.edu");
        var items = await member.GetFromJsonAsync<List<CalendarItemDto>>("/api/v1/calendar/campus");

        Assert.NotNull(items);
        Assert.Contains(items!, i => i.ItemType == "Event" && i.CampusName == "Main Campus");
        Assert.Contains(items!, i => i.ItemType == "Meeting" && i.CampusName == "Main Campus");
        Assert.DoesNotContain(items!, i => i.CampusName == "North Campus");
    }

    [Fact]
    public async Task TC10_CrossCampusEvents_ReturnsBothCampusesPublicEventsOnly()
    {
        var member = CreateClientAs("events.member@main.clc.edu");
        var publicEvents = await member.GetFromJsonAsync<List<PublicCampusEventDto>>("/api/v1/cross-campus/events");

        Assert.NotNull(publicEvents);
        Assert.Contains(publicEvents!, e => e.CampusName == "Main Campus");
        Assert.Contains(publicEvents!, e => e.CampusName == "North Campus");
    }

    [Fact]
    public async Task TC11_StandardQueries_RespondWithin500msTarget()
    {
        var eventsHead = CreateClientAs("events.head@main.clc.edu");
        // Warm-up call
        await eventsHead.GetAsync("/api/v1/calendar/university");

        var sw = Stopwatch.StartNew();
        var res1 = await eventsHead.GetAsync("/api/v1/calendar/campus");
        var res2 = await eventsHead.GetAsync("/api/v1/proposals");
        var res3 = await eventsHead.GetAsync("/api/v1/tasks");
        sw.Stop();

        res1.EnsureSuccessStatusCode();
        res2.EnsureSuccessStatusCode();
        res3.EnsureSuccessStatusCode();

        var avgMs = sw.Elapsed.TotalMilliseconds / 3.0;
        Assert.True(avgMs < 500, $"Expected average query latency < 500ms (NFR-06), actual: {avgMs:F1}ms");
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
