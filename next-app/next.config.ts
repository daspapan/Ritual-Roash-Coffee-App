import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /* env: {
    APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'staging',
    DEBUG: process.env.NEXT_PUBLIC_DEBUG || 'false',
    PLATFORM: process.env.NEXT_PUBLIC_PLATFORM || 'awscloud',
    DATABASE_URL: process.env.NEXT_PUBLIC_DATABASE_URL,
    POSTGRES_HOST: process.env.NEXT_PUBLIC_POSTGRES_HOST,
    POSTGRES_USER: process.env.NEXT_PUBLIC_POSTGRES_USER,
    POSTGRES_PASS: process.env.NEXT_PUBLIC_POSTGRES_PASS,
    POSTGRES_DB: process.env.NEXT_PUBLIC_POSTGRES_DB,
    FILE_STORAGE: process.env.NEXT_PUBLIC_FILE_STORAGE || 's3'

  }, */
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb'
    }
  }
};

export default nextConfig;
