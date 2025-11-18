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
        string? GetConfig(string colonKey, string underscoreKey) =>
            configuration[colonKey] ?? configuration[underscoreKey];

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
    })
    .Build();

await host.RunAsync();
