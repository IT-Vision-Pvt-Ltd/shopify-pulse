import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { addDocumentResponseHeaders } from "./shopify.server";

export const headers: HeadersFunction = (headersArgs) => {
  return addDocumentResponseHeaders(headersArgs);
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
