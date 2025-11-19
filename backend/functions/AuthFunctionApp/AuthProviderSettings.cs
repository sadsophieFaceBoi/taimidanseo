public class AuthProviderSettings
{
    // Public OAuth client IDs / app IDs (not secrets). In Azure, set as App Settings.
    public string? GoogleClientId { get; init; }
    public string? MicrosoftClientId { get; init; }
    public string? FacebookAppId { get; init; }
}