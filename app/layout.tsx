import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "800"],
});

export const metadata: Metadata = {
  title: "Readlet",
  description: "Daily reading streaks with friends.",
  appleWebApp: { capable: true, title: "Readlet", statusBarStyle: "default" },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#FFF7EE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
