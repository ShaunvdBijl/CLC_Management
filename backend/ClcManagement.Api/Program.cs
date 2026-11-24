using System.Text.Json.Serialization;
using ClcManagement.Api.Application.Auth;
using ClcManagement.Api.Application.Services;
using ClcManagement.Api.Hubs;
using ClcManagement.Api.Infrastructure.Data;
using ClcManagement.Api.Infrastructure.Storage;
using ClcManagement.Api.Middleware;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

var authMode = builder.Configuration["Auth:Mode"]
    ?? builder.Configuration["AUTH_MODE"]
    ?? (builder.Environment.IsDevelopment() ? "DevMock" : "EntraId");

if (authMode.Equals("DevMock", StringComparison.OrdinalIgnoreCase) && builder.Environment.IsDevelopment())
{
    builder.Services.AddAuthentication(DevMockAuthHandler.SchemeName)
        .AddScheme<AuthenticationSchemeOptions, DevMockAuthHandler>(DevMockAuthHandler.SchemeName, _ => { });
}
else
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

    builder.Services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/notifications"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });
}

builder.Services.AddAuthorization();

builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddSingleton<IStorageService, LocalVolumeStorageService>();

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddSignalR();
builder.Services.AddOpenApi();

var allowedOriginsRaw = builder.Configuration["Cors:AllowedOrigins"]
    ?? builder.Configuration["CORS_ALLOWED_ORIGINS"]
    ?? "http://localhost:5173";
var allowedOrigins = allowedOriginsRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsRelational())
    {
        await db.Database.EnsureCreatedAsync();
    }
    await DbSeeder.SeedAsync(db);
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("FrontendPolicy");

var storageRoot = builder.Configuration["Storage:RootPath"]
    ?? builder.Configuration["STORAGE_ROOT_PATH"]
    ?? Path.Combine(app.Environment.ContentRootPath, "uploads", "posters");
Directory.CreateDirectory(storageRoot);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.GetFullPath(storageRoot)),
    RequestPath = "/uploads/posters",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.CacheControl = "public, max-age=86400";
    }
});

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", utcTime = DateTime.UtcNow }));
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();

public partial class Program { }
