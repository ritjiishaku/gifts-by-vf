/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Allow the browser to pre-resolve image hosts (was "off", which delayed the
  // first image request by a DNS round trip).
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
    // Admin image uploads go through a Server Action (uploadImageAction), which
    // streams the file in the request body. Next.js rejects any Server Action
    // body over 1 MB by default with a framework-level error, so the client only
    // ever saw its generic "Upload failed. Please try again." message — the
    // action itself never ran. Allow up to 8 MB (the action's own guard caps
    // images at 6 MB) so normal photo uploads reach Supabase Storage.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  images: {
    // next/image is used for Supabase-hosted images (automatic resize + WebP/AVIF).
    // Google Drive hosts stay listed for any not-yet-migrated images. Any other
    // host falls back to a plain <img> via components/SiteImage.jsx, so pasted
    // links never break.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "drive.google.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
