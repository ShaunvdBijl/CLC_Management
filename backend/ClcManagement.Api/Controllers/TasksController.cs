using ClcManagement.Api.Application.Auth;
using ClcManagement.Api.Application.DTOs;
using ClcManagement.Api.Application.Services;
using ClcManagement.Api.Domain;
using ClcManagement.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClcManagement.Api.Controllers;

[ApiController]
[Route("api/v1/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;

    public TasksController(AppDbContext db, ICurrentUserService currentUser, INotificationService notifications)
    {
        _db = db;
        _currentUser = currentUser;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<ActionResult<List<WorkTaskDto>>> GetTasks(
        [FromQuery] Department? department,
        [FromQuery] WorkTaskStatus? status,
        [FromQuery] TaskPriority? priority,
        [FromQuery] Guid? assignedToId,
        [FromQuery] Guid? eventId,
        CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        IQueryable<WorkTask> query = _db.Tasks.AsNoTracking()
            .Where(t => t.CampusId == campusId)
            .Include(t => t.Event)
            .Include(t => t.AssignedBy)
            .Include(t => t.AssignedTo);

        if (!actor.IsLeadership())
        {
            if (actor.Department == Department.None)
                return Ok(new List<WorkTaskDto>());
            query = query.Where(t => t.Department == actor.Department);
        }
        else if (department.HasValue)
        {
            query = query.Where(t => t.Department == department.Value);
        }

        if (status.HasValue) query = query.Where(t => t.Status == status.Value);
        if (priority.HasValue) query = query.Where(t => t.Priority == priority.Value);
        if (assignedToId.HasValue) query = query.Where(t => t.AssignedToId == assignedToId.Value);
        if (eventId.HasValue) query = query.Where(t => t.EventId == eventId.Value);

        var items = await query
            .OrderByDescending(t => t.Priority)
            .ThenBy(t => t.SortOrder)
            .ThenBy(t => t.DueAt)
            .ToListAsync(ct);

        return Ok(items.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<WorkTaskDto>> CreateTask([FromBody] CreateTaskRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        if (!actor.IsDepartmentHead())
            throw new UnauthorizedAccessException("Only Department Heads (Events, Clubs, Marketing) can create and assign departmental tasks.");

        var campusId = actor.RequireCampusId();
        var dept = actor.Department;

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("Task title is required.");

        var assignee = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.AssignedToId && u.CampusId == campusId, ct)
            ?? throw new ArgumentException("Assignee must belong to your campus.");

        if (assignee.Department != dept)
            throw new ArgumentException($"Assignee must belong to the {dept} department.");

        var task = new WorkTask
        {
            CampusId = campusId,
            Department = dept,
            EventId = request.EventId,
            AssignedById = actor.Id,
            AssignedToId = assignee.Id,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Status = WorkTaskStatus.ToDo,
            Priority = request.Priority,
            DueAt = request.DueAt?.ToUniversalTime()
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync(ct);

        await _notifications.SendAsync(
            assignee.Id,
            NotificationType.TaskAssigned,
            $"New {dept} Task Assigned",
            $"{actor.FullName} assigned you: \"{task.Title}\" (Priority: {task.Priority}).",
            "Task",
            task.Id,
            ct);

        var loaded = await LoadTaskAsync(task.Id, ct);
        return CreatedAtAction(nameof(GetTasks), new { id = task.Id }, ToDto(loaded));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkTaskDto>> UpdateTask(Guid id, [FromBody] UpdateTaskRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        if (task.CampusId != campusId || !actor.CanManageDepartment(task.Department))
            throw new UnauthorizedAccessException("Only the owning Department Head can edit task details.");

        var assignee = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.AssignedToId && u.CampusId == campusId && u.Department == task.Department, ct)
            ?? throw new ArgumentException($"Assignee must belong to your campus and the {task.Department} department.");

        var assigneeChanged = task.AssignedToId != assignee.Id;
        task.EventId = request.EventId;
        task.AssignedToId = assignee.Id;
        task.Title = request.Title.Trim();
        task.Description = request.Description.Trim();
        task.Priority = request.Priority;
        task.DueAt = request.DueAt?.ToUniversalTime();
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        if (assigneeChanged)
        {
            await _notifications.SendAsync(
                assignee.Id,
                NotificationType.TaskAssigned,
                $"Task Assigned: {task.Title}",
                $"{actor.FullName} assigned you: \"{task.Title}\".",
                "Task",
                task.Id,
                ct);
        }

        var loaded = await LoadTaskAsync(task.Id, ct);
        return Ok(ToDto(loaded));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<WorkTaskDto>> UpdateTaskStatus(Guid id, [FromBody] UpdateTaskStatusRequest request, CancellationToken ct)
    {
        var actor = await _currentUser.RequireCurrentUserAsync(User, ct);
        var campusId = actor.RequireCampusId();

        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException("Task not found.");

        if (task.CampusId != campusId)
            throw new UnauthorizedAccessException("Cannot update tasks from another campus.");

        var canUpdate = task.AssignedToId == actor.Id || actor.CanManageDepartment(task.Department);
        if (!canUpdate)
            throw new UnauthorizedAccessException("Only the assigned member or their Department Head can update task status.");

        var previousStatus = task.Status;
        task.Status = request.Status;
        task.SortOrder = request.SortOrder;
        task.UpdatedAt = DateTime.UtcNow;

        if (request.Status == WorkTaskStatus.Done && previousStatus != WorkTaskStatus.Done)
        {
            task.CompletedAt = DateTime.UtcNow;
            _db.ActivityLogs.Add(new ActivityLog
            {
                CampusId = campusId,
                Department = task.Department,
                ActorId = actor.Id,
                ActionType = "TaskCompleted",
                EntityType = "Task",
                EntityId = task.Id,
                Summary = $"Completed {task.Department} task: {task.Title}"
            });
        }
        else if (request.Status != WorkTaskStatus.Done)
        {
            task.CompletedAt = null;
        }

        await _db.SaveChangesAsync(ct);

        var loaded = await LoadTaskAsync(task.Id, ct);
        return Ok(ToDto(loaded));
    }

    private async Task<WorkTask> LoadTaskAsync(Guid id, CancellationToken ct) =>
        await _db.Tasks.AsNoTracking()
            .Include(t => t.Event)
            .Include(t => t.AssignedBy)
            .Include(t => t.AssignedTo)
            .FirstAsync(t => t.Id == id, ct);

    private static WorkTaskDto ToDto(WorkTask t) => new(
        t.Id,
        t.CampusId,
        t.Department.ToString(),
        t.EventId,
        t.Event?.Title,
        t.AssignedById,
        t.AssignedBy?.FullName ?? string.Empty,
        t.AssignedToId,
        t.AssignedTo?.FullName ?? string.Empty,
        t.Title,
        t.Description,
        t.Status.ToString(),
        t.Priority.ToString(),
        t.SortOrder,
        t.DueAt,
        t.CompletedAt,
        t.CreatedAt);
}
