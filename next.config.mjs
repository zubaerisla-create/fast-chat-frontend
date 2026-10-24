/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the VPS (see deploy/deploy.sh)
  output: 'standalone',
  images: {
    domains: ['localhost', 'api.dicebear.com'],
  },
};

export default nextConfig;
