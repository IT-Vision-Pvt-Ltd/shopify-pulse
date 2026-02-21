import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function Index() {
  const { showForm } = useLoaderData<typeof loader>();
  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", backgroundColor: "#f6f6f7", fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        background: "white", padding: "40px", borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)", maxWidth: "420px", width: "100%", textAlign: "center"
      }}>
        <h1 style={{ fontSize: "24px", marginBottom: "8px", color: "#1a1a1a" }}>ShopifyPulse</h1>
        <p style={{ color: "#6b7280", marginBottom: "24px" }}>Enter your shop domain to get started</p>
        {showForm && (
          <Form method="get" action="/app">
            <input
              type="text" name="shop" placeholder="your-store.myshopify.com"
              style={{
                width: "100%", padding: "12px 16px", border: "1px solid #d1d5db",
                borderRadius: "8px", fontSize: "15px", marginBottom: "16px",
                boxSizing: "border-box", outline: "none"
              }}
              required
            />
            <button type="submit" style={{
              width: "100%", padding: "12px", backgroundColor: "#008060",
              color: "white", border: "none", borderRadius: "8px",
              fontSize: "15px", fontWeight: 600, cursor: "pointer"
            }}>Log in</button>
          </Form>
        )}
      </div>
    </div>
  );
}
