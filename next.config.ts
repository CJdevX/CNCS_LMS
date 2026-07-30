import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    YOUTUBE_VIDEO_SIZE_MB: process.env.YOUTUBE_VIDEO_SIZE_MB || "100",
  },
};

export default nextConfig;
