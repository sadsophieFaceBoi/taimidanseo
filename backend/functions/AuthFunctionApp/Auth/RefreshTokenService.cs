using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

public class RefreshTokenDocument
{
    [BsonId]
    public ObjectId Id { get; set; }

    public ObjectId UserId { get; set; }

    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public string? ReplacedByTokenHash { get; set; }
}

public interface IRefreshTokenService
{
    Task<string> CreateAsync(ObjectId userId);
    Task<(bool ok, ObjectId userId, string newToken)> ValidateAndRotateAsync(string token);
}

public class RefreshTokenService : IRefreshTokenService
{
    private readonly IMongoCollection<RefreshTokenDocument> _collection;
    private readonly int _lifetimeDays;

    public RefreshTokenService(IMongoDatabase database, IConfiguration config)
    {
        _collection = database.GetCollection<RefreshTokenDocument>("refreshTokens");
        _lifetimeDays = int.TryParse(config["Auth__Refresh__LifetimeDays"], out var d) ? d : 30;
    }

    public async Task<string> CreateAsync(ObjectId userId)
    {
        var token = GenerateToken();
        var hash = Hash(token);
        var now = DateTime.UtcNow;
        var doc = new RefreshTokenDocument
        {
            Id = ObjectId.GenerateNewId(),
            UserId = userId,
            TokenHash = hash,
            CreatedAt = now,
            ExpiresAt = now.AddDays(_lifetimeDays),
        };
        await _collection.InsertOneAsync(doc);
        return token;
    }

    public async Task<(bool ok, ObjectId userId, string newToken)> ValidateAndRotateAsync(string token)
    {
        var hash = Hash(token);
        var now = DateTime.UtcNow;
        var doc = await _collection.Find(x => x.TokenHash == hash).FirstOrDefaultAsync();
        if (doc is null || doc.RevokedAt != null || doc.ExpiresAt <= now)
        {
            return (false, ObjectId.Empty, string.Empty);
        }

        var newToken = GenerateToken();
        var newHash = Hash(newToken);

        var update = Builders<RefreshTokenDocument>.Update
            .Set(x => x.RevokedAt, now)
            .Set(x => x.ReplacedByTokenHash, newHash);

        await _collection.UpdateOneAsync(x => x.Id == doc.Id, update);

        var newDoc = new RefreshTokenDocument
        {
            Id = ObjectId.GenerateNewId(),
            UserId = doc.UserId,
            TokenHash = newHash,
            CreatedAt = now,
            ExpiresAt = now.AddDays(_lifetimeDays)
        };
        await _collection.InsertOneAsync(newDoc);

        return (true, doc.UserId, newToken);
    }

    private static string GenerateToken()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Base64UrlEncode(bytes);
    }

    private static string Hash(string token)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private static string Base64UrlEncode(byte[] data)
    {
        return Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
