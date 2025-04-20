/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration options
  env: {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER
  },
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
