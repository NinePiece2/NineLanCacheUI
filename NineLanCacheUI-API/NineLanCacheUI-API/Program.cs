using NineLanCacheUI_API.Data;
using Microsoft.EntityFrameworkCore;
using NineLanCacheUI_API.Services.LogReader;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;
using NineLanCacheUI_API.Services;
using NineLanCacheUI_API.Steam;
using NineLanCacheUI_API.Services.OriginalDepotEnricher;
using Microsoft.AspNetCore.ResponseCompression;
using NineLanCacheUI_API.Hubs;
using Microsoft.AspNetCore.Rewrite;
using NineLanCacheUI_API.Helpers;
using NineLanCacheUI_API.Services.NetworkMonitor;
namespace NineLanCacheUI_API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            var lanCacheUIDataDirectory = builder.Configuration["LanCacheUIDataDirectory"];
            // Convert to absolute path if it's a relative path
            if (!string.IsNullOrWhiteSpace(lanCacheUIDataDirectory) && !Path.IsPathRooted(lanCacheUIDataDirectory))
            {
                lanCacheUIDataDirectory = Path.GetFullPath(lanCacheUIDataDirectory);
            }
            if (lanCacheUIDataDirectory != null)
            {
                Directory.CreateDirectory(lanCacheUIDataDirectory);
            }

            // Add services to the container.
            //var connectionString = builder.Configuration.GetConnectionString("NineLanCacheUIContextConnection");
            //builder.Services.AddDbContext<NineLanCacheUIDBContext>(options =>
            //    options.UseSqlServer(connectionString));

            var conString = builder.Configuration.GetConnectionString("DefaultConnection");
            var conStringReplaced = conString?.Replace("{LanCacheUIDataDirectory}", lanCacheUIDataDirectory ?? "");

            try
            {
                var sqliteFileName = SqliteFolderCreator.GetFileNameFromSqliteConnectionString(conStringReplaced);

                var invalidPathChars = Path.GetInvalidPathChars();
                if (!string.IsNullOrWhiteSpace(sqliteFileName) && sqliteFileName.All(t => !invalidPathChars.Any(z => t == z)))
                {
                    var parent = Path.GetDirectoryName(sqliteFileName);
                    if (!string.IsNullOrWhiteSpace(parent) && !Directory.Exists(parent))
                    {
                        Directory.CreateDirectory(parent);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error while creating subfolder for database, exception: {ex}");
            }

            builder.Services.AddDbContext<NineLanCacheUIDBContext>(options =>
            {
                options.UseSqlite(conStringReplaced);
            });

            builder.Services.AddControllers(options =>
            {
                options.CacheProfiles.Add("ForeverCache",
                    new CacheProfile()
                    {
                        Duration = 31536000,
                        Location = ResponseCacheLocation.Any
                    });
            }).AddJsonOptions(x =>
                 x.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles); builder.Services.AddEndpointsApiExplorer();

            builder.Services.AddControllers().AddJsonOptions(x => x.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

            builder.Services.AddSwaggerGen();
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            builder.Services.AddOpenApi();
            builder.Services.AddHostedService<DownloadEventAggregationHostedService>();
            builder.Services.AddHttpClient();
            builder.Services.AddSingleton<SteamManifestService>();
            builder.Services.AddHostedService<FrontendRefresherService>();
            builder.Services.AddHostedService<NetworkPollingService>();


            if (Convert.ToBoolean(builder.Configuration["DirectSteamIntegration"]))
            {
                builder.Services.AddHostedService<SteamAppInfoService>();

                //TODO should probably initialize the Steam session here rather than inside the service
                builder.Services.AddSingleton<Steam3Session>();
                builder.Services.AddSingleton<AppInfoHandler>();
                builder.Services.AddSingleton<ISteamAppObtainerService, AppInfoHandler>(t => t.GetRequiredService<AppInfoHandler>());
            }
            else
            {
                builder.Services.AddHostedService<SteamDepotDownloaderHostedService>();
                builder.Services.AddSingleton<SteamDepotEnricherHostedService>();
                builder.Services.AddSingleton<ISteamAppObtainerService, OriginalSteamAppObtainerService>();
            }

            builder.Services.AddSignalR();
            builder.Services.AddResponseCompression(opts =>
            {
                opts.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/octet-stream"]);
            });

            // Configure CORS policy
            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(
                    builder =>
                    {
                        builder.AllowAnyOrigin()
                               .AllowAnyMethod()
                               .AllowAnyHeader();
                    });
            });

            var app = builder.Build();

            app.UseResponseCompression();

            // Applying migrations
            using (var scope = app.Services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<NineLanCacheUIDBContext>();
                Console.WriteLine("Migrating DB (ensure the database folder from the query string exists)...");
                dbContext.Database.Migrate();
                Console.WriteLine("DB migration completed");
            }

            // Configure the HTTP request pipeline.
            //if (app.Environment.IsDevelopment())
            //{
            //    app.MapOpenApi();
            //}
            app.MapOpenApi();

            var option = new RewriteOptions();
            option.AddRedirect("^$", "swagger");
            app.UseRewriter(option);

            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseHttpsRedirection();

            app.UseAuthorization();
            app.UseCors();

            app.MapControllers();
            app.MapHub<UIRefreshHub>("/uirefreshhub");

            // Add version endpoint
            app.MapGet("/api/version", () =>
            {
                var version = Environment.GetEnvironmentVariable("VERSION") ?? "dev";
                return Results.Ok(new
                {
                    version,
                    timestamp = DateTime.UtcNow
                });
            }).WithName("GetVersion").WithOpenApi();

            app.Run();
        }
    }
}
