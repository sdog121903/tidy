import type { NextConfig } from "next";

// The report kit is required at runtime by path and reads its templates (and the embedded font) from
// disk, so file tracing cannot discover any of it — or what it requires — on its own.
const reportFiles = [
  "./report-kit/src/**",
  "./report-kit/templates/**",
  "./node_modules/handlebars/**",
  "./node_modules/@fontsource-variable/bricolage-grotesque/**",
  // The slim Chromium that renders the PDF ships as brotli blobs, extracted at runtime.
  "./node_modules/@sparticuz/chromium/bin/**",
];

const nextConfig: NextConfig = {
  // These use Node's own require/fs; keep them out of the server bundle.
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium", "handlebars"],
  outputFileTracingIncludes: {
    "/api/reports/weekly/pdf": reportFiles,
    "/api/cron/weekly-report": reportFiles,
    // "Send this week's report now" is a server action on the home route.
    "/": reportFiles,
  },
};

export default nextConfig;
