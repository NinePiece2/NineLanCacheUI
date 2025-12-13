import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
