using MongoDB.Bson;

public interface IUserService
{
    Task<UserModel?> GetUserByIdAsync(ObjectId userId);
    Task<UserModel?> GetUserByUsernameAsync(string username);
    Task<UserModel?> GetUserByEmailAsync(string email);
    Task CreateUserAsync(UserModel user);
    Task UpdateUserAsync(UserModel user);
    Task LinkAccountAsync(ObjectId userId, LinkedAccount linkedAccount);
    Task UnlinkAccountAsync(ObjectId userId, AuthProvider provider);
}
public interface IUserAuthService
{
    Task<UserModel?> AuthenticateWithProviderAsync(AuthProvider provider, string providerUserId, string providerEmail);
}