using System.Net;
using System.Net.Http.Json;
using ClcManagement.Api.Application.DTOs;
using ClcManagement.Api.Domain;
using ClcManagement.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace ClcManagement.Tests;

public class ClcWebAppFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"ClcTestDb_{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
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
}

public class ApiWorkflowTests : IClassFixture<ClcWebAppFactory>
{
    private readonly ClcWebAppFactory _factory;

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
    public async Task HealthEndpoint_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task CrossCampusMutation_IsBlockedWithForbidden()
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
    public async Task ProposalStateMachine_RequiresCommentOnChangesRequested_AndAutoCreatesClubOnApproval()
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
    public async Task EventConflictCheck_DetectsVenueAndTimeOverlap()
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
    public async Task CrossCampusEvents_ReturnsBothCampusesPublicEventsOnly()
    {
        var member = CreateClientAs("events.member@main.clc.edu");
        var publicEvents = await member.GetFromJsonAsync<List<PublicCampusEventDto>>("/api/v1/cross-campus/events");

        Assert.NotNull(publicEvents);
        Assert.Contains(publicEvents!, e => e.CampusName == "Main Campus");
        Assert.Contains(publicEvents!, e => e.CampusName == "North Campus");
    }
}
