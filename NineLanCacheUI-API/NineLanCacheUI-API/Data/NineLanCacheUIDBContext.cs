using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NineLanCacheUI_API.Data.Tables;

namespace NineLanCacheUI_API.Data
{
    public class NineLanCacheUIDBContext : DbContext
    {
        public NineLanCacheUIDBContext(DbContextOptions<NineLanCacheUIDBContext> options)
            : base(options)
        {
        }
        public DbSet<DbSteamDepot> SteamDepots => Set<DbSteamDepot>();
        public DbSet<DbDownloadEvent> DownloadEvents => Set<DbDownloadEvent>();
        public DbSet<DbSetting> Settings => Set<DbSetting>();
        public DbSet<DbSteamManifest> SteamManifests => Set<DbSteamManifest>();
        public DbSet<DbExcludedIp> ExcludedIps => Set<DbExcludedIp>();
        public DbSet<DbNetworkInterfaceStat> Stats => Set<DbNetworkInterfaceStat>();
        public DbSet<DbClientName> ClientNames => Set<DbClientName>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<DbDownloadEvent>()
                        .HasIndex(t => t.ClientIp);

            modelBuilder.Entity<DbDownloadEvent>()
                        .HasIndex(t => t.CacheIdentifier);

            modelBuilder.Entity<DbSteamDepot>()
                        .HasKey(pc => new { pc.SteamDepotId, pc.SteamAppId });

            modelBuilder.Entity<DbExcludedIp>()
                        .HasIndex(e => e.IpAddress)
                        .IsUnique();

            modelBuilder.Entity<DbNetworkInterfaceStat>()
                        .HasIndex(s => s.InterfaceName);
        }

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            ArgumentNullException.ThrowIfNull(configurationBuilder);

            configurationBuilder.Properties<DateTime>().HaveConversion<DateTimeAsUtcValueConverter>();
            configurationBuilder.Properties<DateTime?>().HaveConversion<NullableDateTimeAsUtcValueConverter>();
        }
    }
    public class NullableDateTimeAsUtcValueConverter() : ValueConverter<DateTime?, DateTime?>(
    v => !v.HasValue ? v : ToUtc(v.Value), v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v)
    {
        private static DateTime? ToUtc(DateTime v) => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime();
    }

    public class DateTimeAsUtcValueConverter() : ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(), v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
}
