import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { exchangeGoogleCode, saveIntegration } from "../services/integrations.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return redirect("/app/marketing?error=no_code");
  }

  try {
    const redirectUri = `${url.origin}/app/integrations/google-callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);

    await saveIntegration(session.shop, "google", {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: tokens.scope,
    });

    return redirect("/app/marketing?connected=google");
  } catch (error) {
    console.error("Google OAuth error:", error);
    return redirect("/app/marketing?error=google_auth_failed");
  }
};

export default function GoogleCallback() {
  return <div>Connecting Google account...</div>;
}
