import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate, login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // If this is the login path, use login() instead of authenticate.admin()
  if (url.pathname === "/auth/login") {
    return login(request);
  }

  // For OAuth callback, authenticate and redirect to dashboard
  await authenticate.admin(request);
  
  // Redirect to dashboard after successful authentication
  return redirect("/dashboard");
};
