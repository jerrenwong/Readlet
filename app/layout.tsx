import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Libre_Franklin } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Readlet",
  description: "Daily reading streaks with friends.",
  appleWebApp: { capable: true, title: "Readlet", statusBarStyle: "default" },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#F3EEE3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${libreFranklin.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
