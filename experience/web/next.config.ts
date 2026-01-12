import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker/Podman containers
  output: "standalone",

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
};

export default nextConfig;
