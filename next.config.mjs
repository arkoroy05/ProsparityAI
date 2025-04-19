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
};

export default nextConfig;
