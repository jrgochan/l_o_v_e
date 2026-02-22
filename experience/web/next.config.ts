import type { NextConfig } from "next";

const isDesktop = process.env.APP_MODE === "desktop";

const nextConfig: NextConfig = {
  // Disable x-powered-by header for security
  poweredByHeader: false,
  // Enable standalone output for Docker/Podman containers, or export for Desktop
  output: isDesktop ? "export" : "standalone",
  // Disable server-side image optimization for static export
  images: {
    unoptimized: isDesktop,
  },

  // Configure Turbopack for GLSL shaders
  turbopack: {
    rules: {
      // Load GLSL files as text/raw strings
      "*.glsl": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
      "*.vs": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
      "*.fs": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
      "*.vert": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
      "*.frag": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },

  webpack: (config) => {
    // Add GLSL loader for shader files (fallback for webpack mode)
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ["raw-loader"],
    });

    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
