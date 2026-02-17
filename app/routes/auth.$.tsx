import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // If this is the login path, use login() instead of authenticate.admin()
  if (url.pathname === "/auth/login") {
    return login(request);
  }
  
  // For other auth paths (like OAuth callback), use authenticate.admin()
  await authenticate.admin(request);
  return null;
};
