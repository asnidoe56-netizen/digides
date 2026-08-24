import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md / CLAUDE.md — this project manages its
  // own docs.
  agentRules: false,
};

export default nextConfig;
