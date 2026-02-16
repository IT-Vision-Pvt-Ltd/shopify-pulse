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
                  "recharts",
            "date-fns",
      "react-router",
      "react-router-dom",
      "@remix-run/react",
      "@remix-run/node",
      "@remix-run/server-runtime",
    ],
  },
  resolve: {
    alias: {
      "react/jsx-runtime": "react/jsx-runtime",
    },
  },
});
