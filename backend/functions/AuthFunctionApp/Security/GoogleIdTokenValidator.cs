using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

public interface IGoogleIdTokenValidator
{
    Task<GoogleIdPayload?> ValidateAsync(string idToken, string? audience = null, CancellationToken ct = default);
}

public record GoogleIdPayload(string Subject, string? Email, bool EmailVerified);

public class GoogleIdTokenValidator : IGoogleIdTokenValidator
{
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configManager;

    public GoogleIdTokenValidator()
    {
        var metadataAddress = "https://accounts.google.com/.well-known/openid-configuration";
        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            metadataAddress,
            new OpenIdConnectConfigurationRetriever());
    }

    public async Task<GoogleIdPayload?> ValidateAsync(string idToken, string? audience = null, CancellationToken ct = default)
    {
        var config = await _configManager.GetConfigurationAsync(ct);
        var handler = new JwtSecurityTokenHandler();

        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers = new[] { "https://accounts.google.com", "accounts.google.com" },
            ValidateAudience = audience != null,
            ValidAudience = audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = config.SigningKeys,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

        try
        {
            handler.ValidateToken(idToken, parameters, out var validatedToken);
            var jwt = (JwtSecurityToken)validatedToken;
            var sub = jwt.Subject;
            var email = jwt.Payload.TryGetValue("email", out var e) ? e?.ToString() : null;
            var emailVerified = jwt.Payload.TryGetValue("email_verified", out var ev) &&
                                bool.TryParse(ev?.ToString(), out var b) && b;
            return new GoogleIdPayload(sub, email, emailVerified);
        }
        catch
        {
            return null;
        }
    }
}
