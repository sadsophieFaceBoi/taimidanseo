using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

public interface ITokenService
{
    string IssueToken(UserModel user);
    ClaimsPrincipal? ValidateToken(string token);
}

public class TokenService : ITokenService
{
    private readonly string _signingKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _lifetimeMinutes;

    public TokenService(IConfiguration config)
    {
        static string? Get(IConfiguration cfg, string key)
        {
            // Try common variants to support env vars and local.settings.json (Values section)
            return cfg[key]
                ?? cfg[$"Values:{key}"]
                ?? cfg[key.Replace("__", ":")]
                ?? cfg[$"Values:{key.Replace("__", ":")}"];
        }

        _signingKey = Get(config, "Auth__Jwt__SigningKey") ?? string.Empty;
        _issuer = Get(config, "Auth__Jwt__Issuer") ?? string.Empty;
        _audience = Get(config, "Auth__Jwt__Audience") ?? string.Empty;
        _lifetimeMinutes = int.TryParse(Get(config, "Auth__Jwt__LifetimeMinutes"), out var m) ? m : 60;

        if (string.IsNullOrWhiteSpace(_signingKey) || _signingKey.Length < 16)
        {
            throw new InvalidOperationException("Auth__Jwt__SigningKey is missing or too short.");
        }
    }

    public string IssueToken(UserModel user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_signingKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var now = DateTime.UtcNow;
        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty)
            },
            notBefore: now,
            expires: now.AddMinutes(_lifetimeMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = !string.IsNullOrWhiteSpace(_issuer),
            ValidIssuer = _issuer,
            ValidateAudience = !string.IsNullOrWhiteSpace(_audience),
            ValidAudience = _audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_signingKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        try
        {
            var principal = handler.ValidateToken(token, parameters, out _);
            return principal;
        }
        catch
        {
            return null;
        }
    }
}
