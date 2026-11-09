/** @type {import('next').NextConfig} */
const nextConfig = {
  // Separate build dirs let two dev servers run side by side (see the dev:prod-api script)
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Self-contained server bundle for the VPS (see deploy/deploy.sh)
  output: 'standalone',
  images: {
    domains: ['localhost', 'api.dicebear.com'],
  },
};

export default nextConfig;
