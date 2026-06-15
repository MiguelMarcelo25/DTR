/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Allow Supabase Storage signed URLs to render via next/image
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
