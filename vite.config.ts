import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the host env var with the one used by Vercel
if (
  process.env.HOST !== "0.0.0.0" &&
  process.env.REMIX_DEV_ORIGIN &&
  process.env.HOST
) {
  process.env.REMIX_DEV_ORIGIN = process.env.REMIX_DEV_ORIGIN.replace(
    "localhost",
    process.env.HOST
  );
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
  ],
  build: {
    target: "esnext",
  },
  ssr: {
    noExternal: [
      '@shopify/shopify-app-remix',
      '@shopify/polaris',
      '@shopify/app-bridge-react',
      'react',
      'react-dom',
    ],
  },
  resolve: {
    alias: {
      'react/jsx-runtime': 'react/jsx-runtime',
    },
  },
});
