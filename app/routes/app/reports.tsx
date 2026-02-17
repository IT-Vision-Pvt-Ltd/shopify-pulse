
import { Page, Card, BlockStack, Text, Banner } from "@shopify/polaris";

export default function Reports() {
  return (
    <Page title="Reports" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <Banner title="Reports Module" tone="info">
          <p>Generate and download comprehensive reports for your store analytics.</p>
        </Banner>
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Available Reports</Text>
            <Text as="p" variant="bodyMd">Sales Summary, Product Performance, Customer Analytics, Inventory Status</Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
