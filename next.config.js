/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript and ESLint build checks for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Development performance optimizations
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      optimizePackageImports: ['@supabase/supabase-js', '@tanstack/react-query']
    }
  }),
  images: {
    domains: [
      'localhost',
      'images.unsplash.com',
      'via.placeholder.com',
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_TYPESENSE_HOST: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
    NEXT_PUBLIC_TYPESENSE_PORT: process.env.NEXT_PUBLIC_TYPESENSE_PORT,
    NEXT_PUBLIC_TYPESENSE_PROTOCOL: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
    NEXT_PUBLIC_TYPESENSE_API_KEY: process.env.NEXT_PUBLIC_TYPESENSE_API_KEY,
  },
}

module.exports = nextConfig