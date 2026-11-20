import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gym",
  description: "Farhath’s workout log",
  applicationName: "Gym",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym",
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
