using System;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;

public class MongoUserService : IUserService
{
    private readonly IMongoCollection<UserModel> _users;

    public MongoUserService(IMongoCollection<UserModel> users)
    {
        _users = users;
    }

    public async Task<UserModel?> GetUserByIdAsync(ObjectId userId)
    {
        return await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
    }

    public async Task<UserModel?> GetUserByUsernameAsync(string username)
    {
        return await _users.Find(u => u.Username == username).FirstOrDefaultAsync();
    }

    public async Task<UserModel?> GetUserByEmailAsync(string email)
    {
        return await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
    }

    public async Task CreateUserAsync(UserModel user)
    {
        var now = DateTime.UtcNow;
        if (user.CreatedAt == default) user.CreatedAt = now;
        user.UpdatedAt = now;
        await _users.InsertOneAsync(user);
    }

    public async Task UpdateUserAsync(UserModel user)
    {
        user.UpdatedAt = DateTime.UtcNow;
        await _users.ReplaceOneAsync(u => u.Id == user.Id, user);
    }

    public async Task LinkAccountAsync(ObjectId userId, LinkedAccount linkedAccount)
    {
        var user = await GetUserByIdAsync(userId) ?? throw new ArgumentException("User not found", nameof(userId));

        var existing = user.LinkedAccounts.FirstOrDefault(a =>
            a.Provider == linkedAccount.Provider && a.ProviderUserId == linkedAccount.ProviderUserId);

        if (existing is null)
        {
            linkedAccount.LinkedAt = DateTime.UtcNow;
            user.LinkedAccounts.Add(linkedAccount);
        }
        else
        {
            existing.LastLoginAt = DateTime.UtcNow;
            existing.ProviderEmail = string.IsNullOrWhiteSpace(linkedAccount.ProviderEmail)
                ? existing.ProviderEmail
                : linkedAccount.ProviderEmail;
            existing.AccessTokenEncrypted = linkedAccount.AccessTokenEncrypted ?? existing.AccessTokenEncrypted;
            existing.RefreshTokenEncrypted = linkedAccount.RefreshTokenEncrypted ?? existing.RefreshTokenEncrypted;
            existing.AccessTokenExpiresAt = linkedAccount.AccessTokenExpiresAt ?? existing.AccessTokenExpiresAt;
        }

        await UpdateUserAsync(user);
    }

    public async Task UnlinkAccountAsync(ObjectId userId, AuthProvider provider)
    {
        var update = Builders<UserModel>.Update
            .PullFilter(u => u.LinkedAccounts, a => a.Provider == provider)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);

        await _users.UpdateOneAsync(u => u.Id == userId, update);
    }
}
