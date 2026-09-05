export function GET() {
  return Response.json(
    {
      name: "Madie’s Lift Lab",
      short_name: "Lift Lab",
      description: "Private training, scheduling, and programs with Madie’s Lift Lab.",
      start_url: "/lift-lab",
      scope: "/lift-lab",
      display: "standalone",
      background_color: "#050505",
      theme_color: "#050505",
      icons: [
        {
          src: "/icons/madies-lift-lab-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/madies-lift-lab-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600", "Content-Type": "application/manifest+json" } },
  );
}
