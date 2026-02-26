import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  getGoogleAuthUrl,
  getMetaAuthUrl,
  deleteIntegration,
  getIntegration,
} from "../services/integrations.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const url = new URL(request.url);
  const origin = url.origin;

  switch (intent) {
    case "connect-google": {
      const redirectUri = `${origin}/app/integrations/google-callback`;
      const authUrl = getGoogleAuthUrl(session.shop, redirectUri);
      return redirect(authUrl);
    }
    case "connect-meta": {
      const redirectUri = `${origin}/app/integrations/meta-callback`;
      const authUrl = getMetaAuthUrl(session.shop, redirectUri);
      return redirect(authUrl);
    }
    case "disconnect-google": {
      await deleteIntegration(session.shop, "google");
      return redirect("/app/marketing?disconnected=google");
    }
    case "disconnect-meta": {
      await deleteIntegration(session.shop, "meta");
      return redirect("/app/marketing?disconnected=meta");
    }
    default:
      return json({ error: "Unknown intent" }, { status: 400 });
  }
};

export default function Integrations() {
  return null;
}
