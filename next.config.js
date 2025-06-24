/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      appDir: true,
    },
    images: {
      domains: ['localhost'],
      unoptimized: true
    },
    // Enable static export if needed
    // output: 'export',
    // trailingSlash: true,
  }
  
  module.exports = nextConfig