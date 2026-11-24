using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace ClcManagement.Api.Application.Auth;

public class DevMockAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "DevMock";

    public DevMockAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder) : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var email = Request.Headers["X-Dev-User-Email"].FirstOrDefault()
            ?? Request.Query["access_token"].FirstOrDefault()
            ?? Request.Query["dev_user"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(email))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var normalized = email.Trim().ToLowerInvariant();
        var oid = $"dev-oid:{normalized}";
        var claims = new[]
        {
            new Claim("oid", oid),
            new Claim(ClaimTypes.NameIdentifier, oid),
            new Claim(ClaimTypes.Email, normalized),
            new Claim("preferred_username", normalized),
            new Claim("name", normalized.Split('@')[0])
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
