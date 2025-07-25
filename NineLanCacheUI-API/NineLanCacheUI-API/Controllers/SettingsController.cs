using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NineLanCacheUI_API.Data;
using NineLanCacheUI_API.Models;
using System.Linq;
using NineLanCacheUI_API.Helpers;
using NineLanCacheUI_API.Data.Tables;

namespace NineLanCacheUI_API.Controllers
{
    [Route("[controller]/[action]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly ILogger<SettingsController> _logger;
        private readonly NineLanCacheUIDBContext _context;
        public SettingsController(ILogger<SettingsController> logger, NineLanCacheUIDBContext context)
        {
            _logger = logger;
            _context = context;
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

        public class ExcludedIpRequest
        {
            public string Ip { get; set; } = null!;
        }

        public class IpDto
        {
            public string Ip { get; set; } = "";
        }
    }
}
