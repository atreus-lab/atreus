/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      buffer: require.resolve("buffer/"),
    };
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    config.plugins.push(
      new (require("webpack").ProvidePlugin)({
        Buffer: ["buffer", "Buffer"],
      })
    );
    return config;
  },
};

module.exports = nextConfig;
