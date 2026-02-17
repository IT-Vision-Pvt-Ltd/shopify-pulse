import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // For non-embedded app, redirect to dashboard
  return redirect("/dashboard");
};

export default function AppIndex() {
  // This should never render due to the redirect
  return null;
}
