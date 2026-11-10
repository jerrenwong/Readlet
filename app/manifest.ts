import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Readlet",
    short_name: "Readlet",
    description: "Log what you read each day, keep your streak, and see your friends' reads.",
    start_url: "/today",
    display: "standalone",
    background_color: "#FFF7EE",
    theme_color: "#FFF7EE",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
