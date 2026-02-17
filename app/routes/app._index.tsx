import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  return json({ message: "Dashboard loaded successfully" });
};

export default function Dashboard() {
  const { message } = useLoaderData<typeof loader>();
  return (
    <Page title="GrowthPilot AI Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Welcome to GrowthPilot AI</Text>
            <Text as="p">{message}</Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
