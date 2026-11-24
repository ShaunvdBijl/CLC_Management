using ClcManagement.Api.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ClcManagement.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    private readonly ICurrentUserService _currentUserService;

    public NotificationHub(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    public override async Task OnConnectedAsync()
    {
        var user = await _currentUserService.GetOrProvisionUserAsync(Context.User!);
        if (user is not null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{user.Id}");
        }
        await base.OnConnectedAsync();
    }
}
