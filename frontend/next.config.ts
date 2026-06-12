import type { NextConfig } from "next";

const uploadRemotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "http",
    hostname: "localhost",
    port: "5001",
    pathname: "/uploads/**",
  },
];

for (const value of [process.env.NEXT_PUBLIC_BACKEND_URL, process.env.NEXT_PUBLIC_API_URL]) {
  if (!value) {
    continue;
  }

  try {
    const url = new URL(value);
    uploadRemotePatterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/uploads/**",
    });
  } catch {
    // Ignore invalid build-time URLs. The app keeps the local fallback pattern.
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/mes-repas/:path*",
        destination: "/mes-evenements/:path*",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      ...uploadRemotePatterns,
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
