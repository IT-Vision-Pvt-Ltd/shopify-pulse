import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { exchangeMetaCode, saveIntegration } from "../services/integrations.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/app/marketing?error=no_code");
  }

  try {
    const redirectUri = `${url.origin}/app/integrations/meta-callback`;
    const tokens = await exchangeMetaCode(code, redirectUri);

    await saveIntegration(session.shop, "meta", {
      accessToken: tokens.access_token,
      tokenExpiry: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      scopes: "ads_read,ads_management,read_insights,business_management",
    });

    return redirect("/app/marketing?connected=meta");
  } catch (error) {
    console.error("Meta OAuth error:", error);
    return redirect("/app/marketing?error=meta_auth_failed");
  }
};

export default function MetaCallback() {
  return <div>Connecting Meta account...</div>;
}
