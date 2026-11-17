import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Signed-in routes read the session at request time. Leave them dynamic
  // instead of prerendering a shell that could cache a cookie refresh.
  cacheComponents: false,
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
