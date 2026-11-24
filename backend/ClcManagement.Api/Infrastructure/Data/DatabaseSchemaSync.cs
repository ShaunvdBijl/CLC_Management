using Microsoft.EntityFrameworkCore;

namespace ClcManagement.Api.Infrastructure.Data;

/// <summary>
/// Idempotently synchronizes PostgreSQL schema additions on startup so existing
/// persisted volumes survive container restarts and code upgrades without data loss
/// (eliminating the need to run 'docker compose down -v').
/// </summary>
public static class DatabaseSchemaSync
{
    private static readonly string[] IdempotentAlterStatements =
    [
        // Campus metadata columns
        """ALTER TABLE campuses ADD COLUMN IF NOT EXISTS "Address" text NOT NULL DEFAULT '';""",
        """ALTER TABLE campuses ADD COLUMN IF NOT EXISTS "Province" text NOT NULL DEFAULT '';""",
        """ALTER TABLE campuses ADD COLUMN IF NOT EXISTS "ImageUrl" text NOT NULL DEFAULT '';""",
        """ALTER TABLE campuses ADD COLUMN IF NOT EXISTS "Description" text NOT NULL DEFAULT '';""",

        // Club rich details & free-text ClubHeadName (nullable ClubHeadId)
        """ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "WhatTheyDo" text NOT NULL DEFAULT '';""",
        """ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "MeetingSchedule" text NOT NULL DEFAULT '';""",
        """ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "MeetingLocation" text NOT NULL DEFAULT '';""",
        """ALTER TABLE clubs ADD COLUMN IF NOT EXISTS "ClubHeadName" text NOT NULL DEFAULT '';""",
        """ALTER TABLE clubs ALTER COLUMN "ClubHeadId" DROP NOT NULL;""",

        // Proposal club details, free-text ClubHeadName & WhatsApp promo message
        """ALTER TABLE proposals ADD COLUMN IF NOT EXISTS "ProposedClubHeadName" text NULL;""",
        """ALTER TABLE proposals ADD COLUMN IF NOT EXISTS "ClubWhatTheyDo" text NULL;""",
        """ALTER TABLE proposals ADD COLUMN IF NOT EXISTS "ClubMeetingSchedule" text NULL;""",
        """ALTER TABLE proposals ADD COLUMN IF NOT EXISTS "ClubMeetingLocation" text NULL;""",
        """ALTER TABLE proposals ADD COLUMN IF NOT EXISTS "WhatsAppMessage" text NULL;""",

        // Events club association (Campus-Wide vs Club Showcase Event)
        """ALTER TABLE events ADD COLUMN IF NOT EXISTS "ClubId" uuid NULL;""",

        // Meetings MS Teams integration & post-meeting recording/transcript archive
        """ALTER TABLE meetings ADD COLUMN IF NOT EXISTS "TeamsJoinUrl" text NULL;""",
        """ALTER TABLE meetings ADD COLUMN IF NOT EXISTS "TeamsMeetingId" text NULL;""",
        """ALTER TABLE meetings ADD COLUMN IF NOT EXISTS "RecordingUrl" text NULL;""",
        """ALTER TABLE meetings ADD COLUMN IF NOT EXISTS "TranscriptUrl" text NULL;""",
        """ALTER TABLE meetings ADD COLUMN IF NOT EXISTS "TranscriptText" text NULL;""",
        """ALTER TABLE meetings ADD COLUMN IF NOT EXISTS "SummarySyncedAt" timestamp with time zone NULL;"""
    ];

    public static async Task EnsureSchemaUpToDateAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (!db.Database.IsRelational())
            return;

        await db.Database.EnsureCreatedAsync(ct);

        foreach (var sql in IdempotentAlterStatements)
        {
            await db.Database.ExecuteSqlRawAsync(sql, ct);
        }
    }
}
