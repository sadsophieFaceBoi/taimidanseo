using System;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Driver;

public class MongoUserAuthService : IUserAuthService
{
    private readonly IMongoCollection<UserModel> _users;
    private readonly IUserService _userService;

    public MongoUserAuthService(IMongoCollection<UserModel> users, IUserService userService)
    {
        _users = users;
        _userService = userService;
    }

    public async Task<UserModel?> AuthenticateWithProviderAsync(AuthProvider provider, string providerUserId, string providerEmail)
    {
        // 1) Try find by linked provider identity
        var byProvider = await _users
            .Find(u => u.LinkedAccounts.Any(a => a.Provider == provider && a.ProviderUserId == providerUserId))
            .FirstOrDefaultAsync();

        if (byProvider != null)
        {
            byProvider.LastLoginAt = DateTime.UtcNow;
            byProvider.LoginCount += 1;
            await _userService.UpdateUserAsync(byProvider);
            return byProvider;
        }

        // 2) Try to locate by email and link
        UserModel? byEmail = null;
        if (!string.IsNullOrWhiteSpace(providerEmail))
        {
            byEmail = await _userService.GetUserByEmailAsync(providerEmail);
            if (byEmail != null)
            {
                var link = new LinkedAccount
                {
                    ProviderEmail = providerEmail,
                    LinkedAt = DateTime.UtcNow,
                    LastLoginAt = DateTime.UtcNow
                };
                await _userService.LinkAccountAsync(byEmail.Id, link);

                var updated = await _userService.GetUserByIdAsync(byEmail.Id);
                return updated;
            }
        }

        // 3) Create a new user and link the provider
        var now = DateTime.UtcNow;
        var user = new UserModel
        {
            Id = MongoDB.Bson.ObjectId.GenerateNewId(),
            Username = DeriveUsername(providerEmail, provider, providerUserId),
            Email = providerEmail ?? string.Empty,
            EmailVerified = !string.IsNullOrWhiteSpace(providerEmail),
            DisplayName = DeriveDisplayName(providerEmail),
            PictureUrl = string.Empty,
            CreatedAt = now,
            UpdatedAt = now,
            LastLoginAt = now,
            LoginCount = 1,
            Proficiency = SpokenProficiency.Beginner,
        };

        user.LinkedAccounts.Add(new LinkedAccount(provider, providerUserId)
        {
            ProviderEmail = providerEmail ?? string.Empty,
            LinkedAt = now,
            LastLoginAt = now
        });

        await _userService.CreateUserAsync(user);
        return user;
    }

    private static string DeriveUsername(string? email, AuthProvider provider, string providerUserId)
    {
        if (!string.IsNullOrWhiteSpace(email) && email.Contains('@'))
        {
            return email.Split('@')[0];
        }
        return $"{provider.ToString().ToLowerInvariant()}_{providerUserId}";
    }

    private static string DeriveDisplayName(string? email)
    {
        if (!string.IsNullOrWhiteSpace(email) && email.Contains('@'))
        {
            return email.Split('@')[0];
        }
        return "New User";
    }
}
