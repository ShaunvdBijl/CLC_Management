using ClcManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClcManagement.Api.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Campus> Campuses => Set<Campus>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Proposal> Proposals => Set<Proposal>();
    public DbSet<ProposalReview> ProposalReviews => Set<ProposalReview>();
    public DbSet<Club> Clubs => Set<Club>();
    public DbSet<CampusEvent> Events => Set<CampusEvent>();
    public DbSet<EventPoster> EventPosters => Set<EventPoster>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<WorkTask> Tasks => Set<WorkTask>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Campus>(entity =>
        {
            entity.ToTable("campuses");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Code).HasMaxLength(32).IsRequired();
            entity.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.EntraObjectId).HasMaxLength(128).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(256).IsRequired();
            entity.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Role).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Department).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(x => x.EntraObjectId).IsUnique();
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => new { x.CampusId, x.Department, x.Role });
            entity.HasOne(x => x.Campus).WithMany(c => c.Users).HasForeignKey(x => x.CampusId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Proposal>(entity =>
        {
            entity.ToTable("proposals");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ProposalType).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.ProposedVenue).HasMaxLength(200);
            entity.HasIndex(x => new { x.CampusId, x.Status, x.CreatedAt });
            entity.HasOne(x => x.Campus).WithMany(c => c.Proposals).HasForeignKey(x => x.CampusId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.SubmittedBy).WithMany().HasForeignKey(x => x.SubmittedById).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ProposedClubHead).WithMany().HasForeignKey(x => x.ProposedClubHeadId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.TargetEvent).WithMany().HasForeignKey(x => x.TargetEventId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.TargetClub).WithMany().HasForeignKey(x => x.TargetClubId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProposalReview>(entity =>
        {
            entity.ToTable("proposal_reviews");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Decision).HasConversion<string>().HasMaxLength(32);
            entity.HasOne(x => x.Proposal).WithMany(p => p.Reviews).HasForeignKey(x => x.ProposalId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Reviewer).WithMany().HasForeignKey(x => x.ReviewerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Club>(entity =>
        {
            entity.ToTable("clubs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.HasOne(x => x.Campus).WithMany(c => c.Clubs).HasForeignKey(x => x.CampusId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.SourceProposal).WithMany().HasForeignKey(x => x.SourceProposalId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.ClubHead).WithMany().HasForeignKey(x => x.ClubHeadId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CampusEvent>(entity =>
        {
            entity.ToTable("events");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Venue).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(x => new { x.CampusId, x.StartAt, x.EndAt });
            entity.HasIndex(x => new { x.Status, x.StartAt });
            entity.HasOne(x => x.Campus).WithMany(c => c.Events).HasForeignKey(x => x.CampusId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.SourceProposal).WithMany().HasForeignKey(x => x.SourceProposalId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Club).WithMany().HasForeignKey(x => x.ClubId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EventPoster>(entity =>
        {
            entity.ToTable("event_posters");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FileName).HasMaxLength(255).IsRequired();
            entity.Property(x => x.StorageKey).HasMaxLength(512).IsRequired();
            entity.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
            entity.HasOne(x => x.Event).WithMany(e => e.Posters).HasForeignKey(x => x.EventId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.UploadedBy).WithMany().HasForeignKey(x => x.UploadedById).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Meeting>(entity =>
        {
            entity.ToTable("meetings");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Location).HasMaxLength(200).IsRequired();
            entity.HasIndex(x => new { x.CampusId, x.StartAt });
            entity.HasOne(x => x.Campus).WithMany(c => c.Meetings).HasForeignKey(x => x.CampusId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WorkTask>(entity =>
        {
            entity.ToTable("tasks");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Department).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Priority).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(x => new { x.CampusId, x.Department, x.Status, x.Priority });
            entity.HasIndex(x => new { x.AssignedToId, x.Status });
            entity.HasOne(x => x.Campus).WithMany(c => c.Tasks).HasForeignKey(x => x.CampusId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Event).WithMany(e => e.Tasks).HasForeignKey(x => x.EventId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.AssignedBy).WithMany().HasForeignKey(x => x.AssignedById).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.AssignedTo).WithMany().HasForeignKey(x => x.AssignedToId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Type).HasConversion<string>().HasMaxLength(48);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.ReferenceType).HasMaxLength(64);
            entity.HasIndex(x => new { x.UserId, x.IsRead, x.CreatedAt });
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.ToTable("activity_logs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Department).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.ActionType).HasMaxLength(64).IsRequired();
            entity.Property(x => x.EntityType).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Summary).HasMaxLength(500).IsRequired();
            entity.HasIndex(x => new { x.CampusId, x.Department, x.OccurredAt });
            entity.HasOne(x => x.Campus).WithMany().HasForeignKey(x => x.CampusId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Actor).WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
