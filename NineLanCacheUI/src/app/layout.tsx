import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, Gamepad2, Activity, Settings as SettingsIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Nine LanCache UI",
  description: "A user interface for monitoring LanCache",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getTheme() {
                  const cookies = document.cookie.split('; ');
                  const themeCookie = cookies.find(row => row.startsWith('ninelancache-theme='));
                  const savedTheme = themeCookie?.split('=')[1];
                  
                  if (savedTheme === 'dark') {
                    return 'dark';
                  }
                  
                  if (savedTheme === 'light') {
                    return 'light';
                  }
                  
                  if (savedTheme === 'system' || !savedTheme) {
                    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  
                  return 'light';
                }
                
                const theme = getTheme();
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider defaultTheme="system" storageKey="ninelancache-theme">
          <div className="flex flex-col min-h-screen">
            <header className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
              <div className="container mx-auto px-4 py-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href="/"
                      className="flex title-font font-bold items-center text-green-500 hover:text-green-400 transition-colors gap-2 shrink-0"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="w-6 h-6 text-white p-0.5 bg-green-500 rounded-md shrink-0"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                      </svg>
                      <span className="text-xl font-bold hidden sm:inline">Nine LanCache UI</span>
                    </Link>
                    <div className="hidden md:block h-6 w-px bg-border mx-3" aria-hidden="true" />
                    <nav className="hidden md:flex items-center gap-1 flex-1 ml-4">
                      <Button
                        variant="ghost"
                        asChild
                        className="text-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors text-lg"
                      >
                        <Link href="/" className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          <span className="hidden lg:inline">Dashboard</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        asChild
                        className="text-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors text-lg"
                      >
                        <Link href="/RecentDownloads" className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          <span className="hidden lg:inline">Recent Downloads</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        asChild
                        className="text-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors text-lg"
                      >
                        <Link href="/RecentSteamDownloads" className="flex items-center gap-1">
                          <Gamepad2 className="w-4 h-4" />
                          <span className="hidden lg:inline">Steam Downloads</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        asChild
                        className="text-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors text-lg"
                      >
                        <Link href="/SteamGamesDownloaded" className="flex items-center gap-1">
                          <Gamepad2 className="w-4 h-4" />
                          <span className="hidden lg:inline">Games</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        asChild
                        className="text-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors text-lg"
                      >
                        <Link href="/Stats" className="flex items-center gap-1">
                          <Activity className="w-4 h-4" />
                          <span className="hidden lg:inline">Stats</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        asChild
                        className="text-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors text-lg"
                      >
                        <Link href="/Settings" className="flex items-center gap-1">
                          <SettingsIcon className="w-4 h-4" />
                          <span className="hidden lg:inline">Settings</span>
                        </Link>
                      </Button>
                    </nav>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
