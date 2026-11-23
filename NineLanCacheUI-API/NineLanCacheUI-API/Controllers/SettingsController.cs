using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NineLanCacheUI_API.Data;
using NineLanCacheUI_API.Models;
using System.Linq;
using NineLanCacheUI_API.Helpers;
using NineLanCacheUI_API.Data.Tables;
using System.Net;

namespace NineLanCacheUI_API.Controllers
{
    [Route("[controller]/[action]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly ILogger<SettingsController> _logger;
        private readonly NineLanCacheUIDBContext _context;
        private readonly IConfiguration _configuration;
        public SettingsController(
            ILogger<SettingsController> logger,
            NineLanCacheUIDBContext context,
            IConfiguration configuration)
        {
            _logger = logger;
            _context = context;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetExcludedIps()
        {
            var ips = await _context.ExcludedIps
                                    .Select(e => e.IpAddress)
                                    .ToListAsync();
            return Ok(ips);
        }

        [HttpPost]
        public async Task<IActionResult> AddExcludedIp([FromBody] ExcludedIpRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Ip))
                return BadRequest("IP address is required.");

            // Optional: validate IP format here

            bool exists = await _context.ExcludedIps.AnyAsync(e => e.IpAddress == request.Ip);
            if (exists)
                return Conflict("IP address already excluded.");

            var excludedIp = new DbExcludedIp { IpAddress = request.Ip };
            _context.ExcludedIps.Add(excludedIp);
            await _context.SaveChangesAsync();

            return Ok(new { message = "IP added successfully." });
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteExcludedIp([FromBody] IpDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Ip))
                return BadRequest("IP address is required.");

            var excludedIp = await _context.ExcludedIps
                .FirstOrDefaultAsync(e => e.IpAddress == dto.Ip);

            if (excludedIp == null)
                return NotFound(new { message = "IP not found in exclusion list." });

            _context.ExcludedIps.Remove(excludedIp);
            await _context.SaveChangesAsync();

            return Ok(new { message = "IP removed successfully." });
        }

        [HttpGet]
        public async Task<IActionResult> GetNetworkGraphInterface()
        {
            var inter = await _context.Settings.Where(s => s.Key == "NetworkGraphInterface").Select(s => s.Value).FirstOrDefaultAsync();

            return Ok(new { InterfaceName = inter });
        }

        [HttpGet]
        public IActionResult GetVersion()
        {
            var version = Environment.GetEnvironmentVariable("VERSION") ?? "dev";
            return Ok(new { version });
        }

        [HttpGet]
        public async Task<IActionResult> GetClientNames()
        {
            var activeIps = _context.DownloadEvents
                .Where(e => e.CacheHitBytes != 0 || e.CacheMissBytes != 0)
                .Select(e => e.ClientIp)
                .Distinct();

            var clients = await _context.ClientNames
                .Where(c => activeIps.Contains(c.IpAddress))
                .OrderBy(c => c.IpAddress)
                .Select(c => new
                {
                    c.IpAddress,
                    c.Name,
                    c.IsManuallySet
                })
                .ToListAsync();
            return Ok(clients);
        }

        [HttpPost]
        public async Task<IActionResult> SetClientName([FromBody] ClientNameRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.IpAddress)
                || !IPAddress.TryParse(request.IpAddress.Trim(), out var ipAddress))
            {
                return BadRequest("A valid IP address is required.");
            }

            var normalizedIp = ipAddress.ToString();
            var client = await _context.ClientNames.FindAsync(normalizedIp);
            if (client == null)
            {
                return NotFound(new { message = "IP address is not in the client names table." });
            }

            var name = request.Name?.Trim();
            client.Name = string.IsNullOrWhiteSpace(name) ? null : name;
            client.IsManuallySet = !string.IsNullOrWhiteSpace(name);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                client.IpAddress,
                client.Name,
                client.IsManuallySet
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetClientNameLookupSetting()
        {
            var enabled = bool.TryParse(
                _configuration["ClientNameLookupEnabled"],
                out var value) && value;
            return Ok(new { enabled });
        }

        [HttpPost]
        public async Task<IActionResult> SetNetworkGraphInterface([FromBody] NetworkGraphInterface ito)
        {
            if (string.IsNullOrWhiteSpace(ito.Interface))
                return BadRequest("Interface name is required.");
            var setting = await _context.Settings
                .FirstOrDefaultAsync(s => s.Key == "NetworkGraphInterface");
            if (setting == null)
            {
                setting = new DbSetting { Key = "NetworkGraphInterface", Value = ito.Interface };
                _context.Settings.Add(setting);
            }
            else
            {
                setting.Value = ito.Interface;
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "Network graph interface updated successfully." });
        }

        public class ExcludedIpRequest
        {
            public string Ip { get; set; } = null!;
        }

        public class IpDto
        {
            public string Ip { get; set; } = "";
        }
        public class NetworkGraphInterface
        {
            public string Interface { get; set; } = "";
        }

        public class ClientNameRequest
        {
            public string IpAddress { get; set; } = "";
            public string? Name { get; set; }
        }

    }
}
