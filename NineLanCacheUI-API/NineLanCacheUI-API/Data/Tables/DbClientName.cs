using System.ComponentModel.DataAnnotations;

namespace NineLanCacheUI_API.Data.Tables
{
    public class DbClientName
    {
        [Key]
        public required string IpAddress { get; set; }

        public string? Name { get; set; }

        public bool IsManuallySet { get; set; }
    }
}
