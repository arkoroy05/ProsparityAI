/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration options
  webpack: (config) => {
    // Handling Node.js modules in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      fs: false,
    };
    
    return config;
  },
  // Ensure correct handling of both pages and app directory
  experimental: {
    appDocumentPreloading: true,
  },
};

export default nextConfig;
