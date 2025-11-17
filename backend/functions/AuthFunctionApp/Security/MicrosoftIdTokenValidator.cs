using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

public interface IMicrosoftIdTokenValidator
{
    Task<MicrosoftIdPayload?> ValidateAsync(string idToken, string? audience = null, CancellationToken ct = default);
}

public record MicrosoftIdPayload(string Subject, string? Email, string Issuer, string? TenantId);

public class MicrosoftIdTokenValidator : IMicrosoftIdTokenValidator
{
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configManager;
    private readonly string[] _allowedTenants;

    public MicrosoftIdTokenValidator(Microsoft.Extensions.Configuration.IConfiguration config)
    {
        var metadataAddress = "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration";
        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            metadataAddress,
            new OpenIdConnectConfigurationRetriever());
        var tenants = config["Auth__Microsoft__AllowedTenants"] ?? string.Empty;
        _allowedTenants = tenants.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
    }

    public async Task<MicrosoftIdPayload?> ValidateAsync(string idToken, string? audience = null, CancellationToken ct = default)
    {
        var config = await _configManager.GetConfigurationAsync(ct);
        var handler = new JwtSecurityTokenHandler();

        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = false, // issuer varies by tenant; we'll check manually after signature validation
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

            // Minimal issuer shape check
            if (!(jwt.Issuer?.StartsWith("https://login.microsoftonline.com/") ?? false) ||
                !jwt.Issuer.EndsWith("/v2.0"))
            {
                return null;
            }

            var sub = jwt.Subject;
            var email = jwt.Payload.TryGetValue("preferred_username", out var upn) ? upn?.ToString() : null;
            var tid = jwt.Payload.TryGetValue("tid", out var tenant) ? tenant?.ToString() : null;

            if (_allowedTenants.Length > 0)
            {
                if (string.IsNullOrWhiteSpace(tid) || Array.IndexOf(_allowedTenants, tid) < 0)
                {
                    return null;
                }
            }
            return new MicrosoftIdPayload(sub, email, jwt.Issuer, tid);
        }
        catch
        {
            return null;
        }
    }
}
