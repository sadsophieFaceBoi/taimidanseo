using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using MongoDB.Bson;

public partial class AuthFunctions
{
    private readonly IUserAuthService _authService;
    private readonly IUserService _userService;
    private readonly ITokenService _tokenService;
    private readonly IGoogleIdTokenValidator _googleValidator;
    private readonly IMicrosoftIdTokenValidator _microsoftValidator;
    private readonly IRefreshTokenService _refreshTokens;

    private readonly AuthProviderSettings _providerSettings;

    public AuthFunctions(
        IUserAuthService authService,
        IUserService userService,
        ITokenService tokenService,
        IGoogleIdTokenValidator googleValidator,
        IMicrosoftIdTokenValidator microsoftValidator,
        IRefreshTokenService refreshTokens,
        AuthProviderSettings providerSettings)
    {
        _authService = authService;
        _userService = userService;
        _tokenService = tokenService;
        _googleValidator = googleValidator;
        _microsoftValidator = microsoftValidator;
        _refreshTokens = refreshTokens;
        _providerSettings = providerSettings;
    }

    [Function("SignIn")] 
    public async Task<HttpResponseData> SignIn(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "auth/signin")] HttpRequestData req)
    {
        var request = await JsonSerializer.DeserializeAsync<SignInRequest>(req.Body, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (request is null)
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "Invalid request." });
            return bad;
        }

        if (!Enum.TryParse<AuthProvider>(request.Provider, ignoreCase: true, out var provider))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "Unknown provider." });
            return bad;
        }

        string providerUserId = request.ProviderUserId;
        string? providerEmail = request.ProviderEmail;

        // If Google and idToken provided, validate and extract user info; enforce expected audience if configured
        if (provider == AuthProvider.Google && !string.IsNullOrWhiteSpace(request.IdToken))
        {
            var configured = _providerSettings.GoogleClientId;
            var audience = configured ?? (request.ClientId ?? request.GoogleClientId);
            if (configured != null && (request.ClientId != null || request.GoogleClientId != null) && audience != configured)
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteAsJsonAsync(new { error = "Google audience mismatch." });
                return unauthorized;
            }
            GoogleIdPayload? payload = null;
            try
            {
                payload = await _googleValidator.ValidateAsync(request.IdToken!, audience: audience);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignIn] Google validation exception: {ex.GetType().Name} {ex.Message}");
            }
            if (payload is null)
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteAsJsonAsync(new { error = "Invalid Google ID token." });
                return unauthorized;
            }
            providerUserId = payload.Subject;
            providerEmail = payload.Email ?? providerEmail;
        }

        // If Microsoft and idToken provided, validate and extract user info; enforce expected audience if configured
        if (provider == AuthProvider.Microsoft && !string.IsNullOrWhiteSpace(request.IdToken))
        {
            var configured = _providerSettings.MicrosoftClientId;
            var audience = configured ?? (request.ClientId ?? request.MicrosoftClientId);
            if (configured != null && (request.ClientId != null || request.MicrosoftClientId != null) && audience != configured)
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteAsJsonAsync(new { error = "Microsoft audience mismatch." });
                return unauthorized;
            }
            MicrosoftIdPayload? payload = null;
            try
            {
                payload = await _microsoftValidator.ValidateAsync(request.IdToken!, audience: audience);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignIn] Microsoft validation exception: {ex.GetType().Name} {ex.Message}");
            }
            if (payload is null)
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteAsJsonAsync(new { error = "Invalid Microsoft ID token." });
                return unauthorized;
            }
            providerUserId = payload.Subject;
            providerEmail = payload.Email ?? providerEmail;
        }

        if (string.IsNullOrWhiteSpace(providerUserId))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "Missing provider user id." });
            return bad;
        }

        var user = await _authService.AuthenticateWithProviderAsync(provider, providerUserId, providerEmail ?? string.Empty);
        if (user is null)
        {
            var notFound = req.CreateResponse(HttpStatusCode.Unauthorized);
            await notFound.WriteAsJsonAsync(new { error = "Authentication failed." });
            return notFound;
        }

        var resp = req.CreateResponse(HttpStatusCode.OK);
        var token = _tokenService.IssueToken(user);
        var refresh = await _refreshTokens.CreateAsync(user.Id);
        await resp.WriteAsJsonAsync(new SignInResponse
        {
            UserId = user.Id.ToString(),
            Username = user.Username,
            Email = user.Email,
            DisplayName = user.DisplayName,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            AccessToken = token,
            RefreshToken = refresh
        });
        return resp;
    }
}

public partial class AuthFunctions
{
    [Function("Refresh")]
    public async Task<HttpResponseData> Refresh(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "auth/refresh")] HttpRequestData req)
    {
        var payload = await JsonSerializer.DeserializeAsync<RefreshRequest>(req.Body, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (payload is null || string.IsNullOrWhiteSpace(payload.RefreshToken))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "Invalid request." });
            return bad;
        }

        var result = await _refreshTokens.ValidateAndRotateAsync(payload.RefreshToken);
        if (!result.ok)
        {
            var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
            await unauthorized.WriteAsJsonAsync(new { error = "Invalid or expired refresh token." });
            return unauthorized;
        }

        var user = await _userService.GetUserByIdAsync(result.userId);
        if (user is null)
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            await notFound.WriteAsJsonAsync(new { error = "User not found." });
            return notFound;
        }

        var access = _tokenService.IssueToken(user);
        var resp = req.CreateResponse(HttpStatusCode.OK);
        await resp.WriteAsJsonAsync(new RefreshResponse
        {
            AccessToken = access,
            RefreshToken = result.newToken
        });
        return resp;
    }
}

public class RefreshRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class RefreshResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
}

public class SignInRequest
{
    public string Provider { get; set; } = string.Empty; // e.g. "Google"
    public string ProviderUserId { get; set; } = string.Empty; // provider subject id
    public string? ProviderEmail { get; set; }
    public string? IdToken { get; set; } // Google ID token (optional)
    public string? GoogleClientId { get; set; } // audience to validate against (optional)
    public string? MicrosoftClientId { get; set; } // audience to validate against (optional)
    public string? ClientId { get; set; } // generic audience
}

public class SignInResponse
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
}

public partial class AuthFunctions
{
    [Function("Me")]
    public async Task<HttpResponseData> Me(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "auth/me")] HttpRequestData req)
    {
        if (!req.Headers.TryGetValues("Authorization", out var values))
        {
            var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
            await unauthorized.WriteAsJsonAsync(new { error = "Missing Authorization header." });
            return unauthorized;
        }

        var authHeader = System.Linq.Enumerable.FirstOrDefault(values);
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
            await unauthorized.WriteAsJsonAsync(new { error = "Invalid Authorization header." });
            return unauthorized;
        }

        var token = authHeader.Substring("Bearer ".Length).Trim();
        var principal = _tokenService.ValidateToken(token);
        if (principal is null)
        {
            var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
            await unauthorized.WriteAsJsonAsync(new { error = "Invalid token." });
            return unauthorized;
        }

        var sub = principal.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        if (string.IsNullOrWhiteSpace(sub) || !ObjectId.TryParse(sub, out var oid))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "Token subject is invalid." });
            return bad;
        }

        var user = await _userService.GetUserByIdAsync(oid);
        if (user is null)
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            await notFound.WriteAsJsonAsync(new { error = "User not found." });
            return notFound;
        }

        var resp = req.CreateResponse(HttpStatusCode.OK);
        await resp.WriteAsJsonAsync(new SignInResponse
        {
            UserId = user.Id.ToString(),
            Username = user.Username,
            Email = user.Email,
            DisplayName = user.DisplayName,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            AccessToken = token
        });
        return resp;
    }
}
