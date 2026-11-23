using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NineLanCacheUI_API.Migrations
{
    /// <inheritdoc />
    public partial class AddClientNamesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClientNames",
                columns: table => new
                {
                    IpAddress = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: true),
                    IsManuallySet = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientNames", x => x.IpAddress);
                });

            migrationBuilder.Sql("""
                INSERT OR IGNORE INTO "ClientNames" ("IpAddress", "Name", "IsManuallySet")
                SELECT DISTINCT "ClientIp", NULL, 0
                FROM "DownloadEvents"
                WHERE "ClientIp" IS NOT NULL
                  AND TRIM("ClientIp") <> ''
                  AND ("CacheHitBytes" != 0 OR "CacheMissBytes" != 0);
                """);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClientNames");
        }
    }
}
