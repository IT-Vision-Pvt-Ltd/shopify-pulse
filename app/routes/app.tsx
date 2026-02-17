import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '200px', borderRight: '1px solid #ccc', padding: '20px' }}>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li><Link to="/app">Dashboard</Link></li>
          <li><Link to="/app/analytics">Analytics</Link></li>
          <li><Link to="/app/orders">Orders</Link></li>
          <li><Link to="/app/products">Products</Link></li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
}
