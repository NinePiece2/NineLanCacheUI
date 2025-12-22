"use client";
import "../globals.css";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Download,
  Gamepad2,
  Activity,
  Settings as SettingsIcon,
  Menu,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <ThemeProvider defaultTheme="system" storageKey="ninelancache-theme">
      <div className="flex flex-col min-h-screen">
        <header className="border-b border-border bg-background sticky top-0 z-50">
          <div
            className="container mx-auto"
            style={{ paddingTop: "0.5em", paddingBottom: "0.5em" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="flex title-font font-bold items-center text-green-500 hover:text-green-400 transition-colors gap-2 shrink-0"
                >
                  <Image
                    src="/NineLanCacheUI_Logo.png"
                    alt="Nine LanCache Logo"
                    width={24}
                    height={24}
                    className="shrink-0"
                  />
                  <span className="text-xl font-bold hidden sm:inline">Nine LanCache UI</span>
                </Link>
                <div className="hidden md:block h-6 w-px bg-border mx-3 mr-0" aria-hidden="true" />
                <nav className="hidden md:flex items-center gap-1 flex-1 ml-4">
                  <Button
                    variant="ghost"
                    asChild
                    className={`text-lg transition-colors flex items-center gap-1 ${isActive("/") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                  >
                    <Link href="/" className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden xl:inline">Dashboard</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    asChild
                    className={`text-lg transition-colors flex items-center gap-1 ${isActive("/RecentDownloads") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                  >
                    <Link href="/RecentDownloads" className="flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      <span className="hidden xl:inline">Recent Downloads</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    asChild
                    className={`text-lg transition-colors flex items-center gap-1 ${isActive("/RecentSteamDownloads") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                  >
                    <Link href="/RecentSteamDownloads" className="flex items-center gap-1">
                      <Gamepad2 className="w-4 h-4" />
                      <span className="hidden xl:inline">Steam Downloads</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    asChild
                    className={`text-lg transition-colors flex items-center gap-1 ${isActive("/SteamGamesDownloaded") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                  >
                    <Link href="/SteamGamesDownloaded" className="flex items-center gap-1">
                      <Gamepad2 className="w-4 h-4" />
                      <span className="hidden xl:inline">Games</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    asChild
                    className={`text-lg transition-colors flex items-center gap-1 ${isActive("/Stats") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                  >
                    <Link href="/Stats" className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      <span className="hidden xl:inline">Stats</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    asChild
                    className={`text-lg transition-colors flex items-center gap-1 ${isActive("/Settings") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                  >
                    <Link href="/Settings" className="flex items-center gap-1">
                      <SettingsIcon className="w-4 h-4" />
                      <span className="hidden xl:inline">Settings</span>
                    </Link>
                  </Button>
                </nav>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="md:hidden p-2 rounded hover:bg-card"
                  aria-label="Toggle menu"
                  onClick={() => setMobileOpen((s) => !s)}
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <ThemeToggle />
              </div>
            </div>
          </div>
          <div
            className={`md:hidden border-t border-border bg-background overflow-hidden transition-all duration-400 ease-out ${
              mobileOpen
                ? "max-h-200 opacity-100 translate-y-0"
                : "max-h-0 opacity-0 -translate-y-2"
            }`}
            aria-hidden={!mobileOpen}
          >
            <div className="container mx-auto py-2">
              <nav className="flex flex-col gap-1">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded ${isActive("/") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/RecentDownloads"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded ${isActive("/RecentDownloads") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                >
                  <Download className="w-5 h-5" />
                  <span>Recent Downloads</span>
                </Link>
                <Link
                  href="/RecentSteamDownloads"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded ${isActive("/RecentSteamDownloads") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                >
                  <Gamepad2 className="w-5 h-5" />
                  <span>Steam Downloads</span>
                </Link>
                <Link
                  href="/SteamGamesDownloaded"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded ${isActive("/SteamGamesDownloaded") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                >
                  <Gamepad2 className="w-5 h-5" />
                  <span>Games</span>
                </Link>
                <Link
                  href="/Stats"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded ${isActive("/Stats") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                >
                  <Activity className="w-5 h-5" />
                  <span>Stats</span>
                </Link>
                <Link
                  href="/Settings"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded ${isActive("/Settings") ? "text-green-500 bg-green-500/10" : "text-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                >
                  <SettingsIcon className="w-5 h-5" />
                  <span>Settings</span>
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </ThemeProvider>
  );
}
