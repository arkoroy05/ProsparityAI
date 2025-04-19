/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable app router while maintaining pages directory support during migration
  experimental: {
    appDir: true,
  },
};

export default nextConfig;
