using ClcManagement.Api.Domain;
using ClcManagement.Api.Hubs;
using ClcManagement.Api.Infrastructure.Data;
using Microsoft.AspNetCore.SignalR;

namespace ClcManagement.Api.Application.Services;

public interface INotificationService
{
    Task SendAsync(Guid userId, NotificationType type, string title, string message, string? referenceType = null, Guid? referenceId = null, CancellationToken ct = default);
    Task SendToManyAsync(IEnumerable<Guid> userIds, NotificationType type, string title, string message, string? referenceType = null, Guid? referenceId = null, CancellationToken ct = default);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(AppDbContext db, IHubContext<NotificationHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    public async Task SendAsync(
        Guid userId,
        NotificationType type,
        string title,
        string message,
        string? referenceType = null,
        Guid? referenceId = null,
        CancellationToken ct = default)
    {
        var entity = new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            IsRead = false
        };

        _db.Notifications.Add(entity);
        await _db.SaveChangesAsync(ct);

        await _hubContext.Clients.Group($"user:{userId}").SendAsync("ReceiveNotification", new
        {
            entity.Id,
            Type = entity.Type.ToString(),
            entity.Title,
            entity.Message,
            entity.ReferenceType,
            entity.ReferenceId,
            entity.IsRead,
            entity.CreatedAt
        }, ct);
    }

    public async Task SendToManyAsync(
        IEnumerable<Guid> userIds,
        NotificationType type,
        string title,
        string message,
        string? referenceType = null,
        Guid? referenceId = null,
        CancellationToken ct = default)
    {
        var distinctIds = userIds.Distinct().ToList();
        if (distinctIds.Count == 0) return;

        var entities = distinctIds.Select(uid => new Notification
        {
            UserId = uid,
            Type = type,
            Title = title,
            Message = message,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            IsRead = false
        }).ToList();

        _db.Notifications.AddRange(entities);
        await _db.SaveChangesAsync(ct);

        foreach (var entity in entities)
        {
            await _hubContext.Clients.Group($"user:{entity.UserId}").SendAsync("ReceiveNotification", new
            {
                entity.Id,
                Type = entity.Type.ToString(),
                entity.Title,
                entity.Message,
                entity.ReferenceType,
                entity.ReferenceId,
                entity.IsRead,
                entity.CreatedAt
            }, ct);
        }
    }
}
