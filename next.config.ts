import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    INFOBIP_BASE_URL: process.env.INFOBIP_BASE_URL,
    INFOBIP_API_KEY: process.env.INFOBIP_API_KEY,
    INFOBIP_SENDER_NUMBER: process.env.INFOBIP_SENDER_NUMBER,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
