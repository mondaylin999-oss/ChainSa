/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@google/earthengine"],
  outputFileTracingIncludes: {
    "/api/explore/observations": ["./public/township-boundaries.geojson"],
  },
  // Server secrets are read with process.env inside server-only modules.
  // Never add API keys to `env` here or prefix them with NEXT_PUBLIC_ — that would inline them into browser code.
};
export default nextConfig;
