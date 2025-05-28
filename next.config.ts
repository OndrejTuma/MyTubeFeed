/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    turbo: true
  },
  images: {
    domains: ['yt3.ggpht.com', 'i.ytimg.com'],
  },
}

export default nextConfig
