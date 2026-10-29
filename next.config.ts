import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd()),
  compress: true,
  // Migrated from experimental.serverComponentsExternalPackages (deprecated in Next.js 15)
  serverExternalPackages: [
    '@opentelemetry/sdk-node', 
    '@opentelemetry/auto-instrumentations-node', 
    '@opentelemetry/exporter-trace-otlp-http'
  ],
  // Increase API route timeout for long-running operations like AI generation
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // For Vercel deployment - configure max duration
  ...(process.env.VERCEL && {
    maxDuration: 300, // 5 minutes for serverless functions
  }),
  // Proxy API and queue requests to the backend gateway
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL
    // Queue endpoints are on the gateway root, not under /agent/
    const gatewayUrl = backendUrl.replace(/\/agent$/, '');
    return [ 
      {
        source: '/agent/:path*',
        destination: `${backendUrl}/:path*`,
      },
      // Queue status/result polling endpoints (same origin, proxied to gateway)
      {
        source: '/api/v1/queue/:path*',
        destination: `${gatewayUrl}/api/v1/queue/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // {
      //   protocol: "https",
      //   hostname: "images.unsplash.com",
      // },
      // {
      //   protocol: "https",
      //   hostname: "plus.unsplash.com",
      // },
    ],
    dangerouslyAllowSVG: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NODE_ENV === 'production' ? 'https://try.kiyoai.in' : '*',
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-Requested-With, Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
