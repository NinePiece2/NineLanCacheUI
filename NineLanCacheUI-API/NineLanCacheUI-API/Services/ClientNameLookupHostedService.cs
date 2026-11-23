using System.Net;
using Microsoft.EntityFrameworkCore;
using NineLanCacheUI_API.Data;
using NineLanCacheUI_API.Data.Tables;

namespace NineLanCacheUI_API.Services
{
    public class ClientNameLookupHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ClientNameLookupHostedService> _logger;
        private readonly IConfiguration _configuration;

        public ClientNameLookupHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<ClientNameLookupHostedService> logger,
            IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await RunLookupAsync(stoppingToken);

            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(30));
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await RunLookupAsync(stoppingToken);
            }
        }

        private async Task RunLookupAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<NineLanCacheUIDBContext>();
                var enabled = bool.TryParse(
                    _configuration["ClientNameLookupEnabled"],
                    out var lookupEnabled) && lookupEnabled;

                var ips = await context.DownloadEvents
                    .Where(e =>
                        e.ClientIp != null
                        && e.ClientIp != ""
                        && (e.CacheHitBytes != 0 || e.CacheMissBytes != 0))
                    .Select(e => e.ClientIp)
                    .Distinct()
                    .ToListAsync(cancellationToken);

                foreach (var ip in ips)
                {
                    if (await context.ClientNames.AllAsync(c => c.IpAddress != ip, cancellationToken))
                    {
                        context.ClientNames.Add(new DbClientName
                        {
                            IpAddress = ip,
                            Name = null,
                            IsManuallySet = false
                        });
                    }
                }
                await context.SaveChangesAsync(cancellationToken);

                if (!enabled)
                {
                    return;
                }

                var names = await context.ClientNames
                    .Where(c => !c.IsManuallySet)
                    .ToListAsync(cancellationToken);

                foreach (var client in names)
                {
                    if (!IPAddress.TryParse(client.IpAddress, out var address))
                    {
                        continue;
                    }

                    try
                    {
                        var hostname = (await Dns.GetHostEntryAsync(address)).HostName?.Trim();
                        if (!string.IsNullOrWhiteSpace(hostname)
                            && !hostname.Equals(client.IpAddress, StringComparison.OrdinalIgnoreCase))
                        {
                            client.Name = hostname;
                        }
                        else
                        {
                            client.Name = null;
                        }
                    }
                    catch (Exception ex) when (
                        ex is System.Net.Sockets.SocketException
                        or InvalidOperationException)
                    {
                        client.Name = null;
                    }
                }

                await context.SaveChangesAsync(cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to refresh client names");
            }
        }
    }
}
