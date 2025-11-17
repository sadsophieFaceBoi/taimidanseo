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

        var mongoConnection = configuration["Mongo__ConnectionString"] ?? "";
        var mongoDatabase = configuration["Mongo__Database"] ?? "";
        var usersCollection = configuration["Mongo__UsersCollection"] ?? "users";

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
