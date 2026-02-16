import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

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
      "@shopify/shopify-app-remix",
      "@shopify/polaris",
      "@shopify/app-bridge-react",
      "react",
      "react-dom",
    ],
  },
  resolve: {
    alias: {
      "react/jsx-runtime": "react/jsx-runtime",
    },
  },
});
