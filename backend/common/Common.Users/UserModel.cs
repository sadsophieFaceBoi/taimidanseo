using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

[BsonIgnoreExtraElements]
public class UserModel
{
    [BsonId]
    public ObjectId Id { get; set; }

    public string Username { get; set; } = string.Empty;

    // Primary email used for contact and uniqueness
    public string Email { get; set; } = string.Empty;

    public bool EmailVerified { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public string PictureUrl { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public int LoginCount { get; set; }

    public SpokenProficiency Proficiency { get; set; }

    public UserBio Bio { get; set; } = new();

    // One user can have multiple external accounts (Google, Microsoft, Facebook, etc.)
    public List<LinkedAccount> LinkedAccounts { get; set; } = new List<LinkedAccount>();

    public UserModel()
    {
    }

    public UserModel(ObjectId id, string username, string email, DateTime createdAt, DateTime updatedAt)
    {
        Id = id;
        Username = username;
        Email = email;
        CreatedAt = createdAt;
        UpdatedAt = updatedAt;
    }
}

public class LinkedAccount
{
    // Provider type (Google, Microsoft, Facebook)
    public AuthProvider Provider { get; set; }

    // Stable subject identifier from the provider (sub/object id)
    public string ProviderUserId { get; set; } = string.Empty;

    // Email reported by the provider for this account
    public string ProviderEmail { get; set; } = string.Empty;

    public DateTime LinkedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    // Optional: only if you need to call provider APIs server-side; store encrypted
    public string? AccessTokenEncrypted { get; set; }

    public string? RefreshTokenEncrypted { get; set; }

    public DateTime? AccessTokenExpiresAt { get; set; }
}

public enum AuthProvider
{
    Google,
    Microsoft,
    Facebook
}

public class UserBio
{
    public string AboutMe { get; set; } = string.Empty;

    public string Interests { get; set; } = string.Empty;
}

public enum SpokenProficiency
{
    Beginner,
    Intermediate,
    Advanced,
    Native
}