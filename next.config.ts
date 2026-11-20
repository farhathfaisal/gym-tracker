import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Signed-in routes read the session at request time. Leave them dynamic
  // instead of prerendering a shell that could cache a cookie refresh.
  cacheComponents: false,
  async redirects() {
    return [
      { source: "/sign-in", destination: "/", permanent: false },
      { source: "/auth/confirm", destination: "/", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
