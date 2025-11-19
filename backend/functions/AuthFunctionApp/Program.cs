using System;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Configuration;
using MongoDB.Driver;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureAppConfiguration((context, config) =>
    {
        config.AddEnvironmentVariables();
        config.AddJsonFile("local.settings.json", optional: true, reloadOnChange: true);
    })
    .ConfigureServices((context, services) =>
    {
        var configuration = context.Configuration;

        // Prefer colon-delimited keys (standard for .NET configuration),
        // but fall back to double-underscore env var style if present.
        string? GetConfig(string colonKey, string underscoreKey)
        {
            // Try direct env/application settings first
            var direct = configuration[colonKey] ?? configuration[underscoreKey];
            if (!string.IsNullOrWhiteSpace(direct)) return direct;
            // Functions local.settings.json keeps values under the "Values" section
            var valuesScoped = configuration[$"Values:{colonKey}"] ?? configuration[$"Values:{underscoreKey}"];
            if (!string.IsNullOrWhiteSpace(valuesScoped)) return valuesScoped;
            return null;
        }

        var mongoConnection = GetConfig("Mongo:ConnectionString", "Mongo__ConnectionString") ?? string.Empty;
        var mongoDatabase = GetConfig("Mongo:Database", "Mongo__Database") ?? string.Empty;
        var usersCollection = GetConfig("Mongo:UsersCollection", "Mongo__UsersCollection") ?? "users";

        if (string.IsNullOrWhiteSpace(mongoConnection) || string.IsNullOrWhiteSpace(mongoDatabase))
        {
            throw new InvalidOperationException("Mongo configuration is missing. Set Mongo__ConnectionString and Mongo__Database.");
        }

        services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoConnection));
        services.AddSingleton(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(mongoDatabase));
        services.AddSingleton(sp => sp.GetRequiredService<IMongoDatabase>().GetCollection<UserModel>(usersCollection));

        services.AddScoped<IUserService, MongoUserService>();
        services.AddScoped<IUserAuthService, MongoUserAuthService>();
        services.AddSingleton<ITokenService, TokenService>();
        services.AddSingleton<IGoogleIdTokenValidator, GoogleIdTokenValidator>();
        services.AddSingleton<IMicrosoftIdTokenValidator, MicrosoftIdTokenValidator>();
        services.AddSingleton<IRefreshTokenService, RefreshTokenService>();

        // Centralized provider client IDs (public identifiers, not secrets)
        var authSettings = new AuthProviderSettings
        {
            GoogleClientId = GetConfig("Auth:GoogleClientId", "Auth__GoogleClientId"),
            MicrosoftClientId = GetConfig("Auth:MicrosoftClientId", "Auth__MicrosoftClientId"),
            FacebookAppId = GetConfig("Auth:FacebookAppId", "Auth__FacebookAppId")
        };
        Console.WriteLine($"[Startup] Provider IDs => Google='{authSettings.GoogleClientId ?? "(null)"}', Microsoft='{authSettings.MicrosoftClientId ?? "(null)"}', Facebook='{authSettings.FacebookAppId ?? "(null)"}'");
        services.AddSingleton(authSettings);
    })
    .Build();

await host.RunAsync();
