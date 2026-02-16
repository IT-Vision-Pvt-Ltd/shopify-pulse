import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  DataTable,
  Box,
  Divider,
  Icon,
  Button,
  Banner,
  EmptyState,
  Spinner,
} from "@shopify/polaris";
import {
  ReportIcon,
  CalendarIcon,
  ChartVerticalIcon,
  AlertCircleIcon,
  RefreshIcon,
} from "@shopify/polaris-icons";
import { useState } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // In production, fetch from database
  const reports = [
    {
      id: "1",
      title: "Weekly Sales Analysis",
      type: "sales",
      status: "completed",
      generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      summary: "Revenue increased by 15% compared to last week. Top performing category: Electronics.",
      insights: [
        "Revenue growth driven by 3 new product launches",
        "Customer acquisition cost decreased by 8%",
        "Average order value up $12 from last week",
      ],
    },
    {
      id: "2",
      title: "Customer Retention Report",
      type: "customers",
      status: "completed",
      generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      summary: "Repeat purchase rate improved to 34%. VIP segment grew by 5 customers.",
      insights: [
        "Email campaigns showing 22% open rate improvement",
        "New loyalty program driving 15% more repeat purchases",
        "At-risk customer segment identified: 12 customers inactive 60+ days",
      ],
    },
    {
      id: "3",
      title: "Inventory Forecast",
      type: "inventory",
      status: "completed",
      generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      summary: "3 products predicted to run out within 7 days. Recommend restocking immediately.",
      insights: [
        "Product A: estimated stockout in 5 days at current sell rate",
        "Product B: overstock detected, 120 days of supply",
        "Seasonal demand spike expected next month for winter category",
      ],
    },
    {
      id: "4",
      title: "Monthly Performance Summary",
      type: "overview",
      status: "completed",
      generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      summary: "Strong month overall with 23% revenue growth. All KPIs trending positively.",
      insights: [
        "Best performing month in last quarter",
        "New product launches contributed 30% of total revenue",
        "Customer satisfaction scores improved by 4 points",
      ],
    },
  ];

  return json({ reports });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  // Trigger new AI report generation
  return json({ success: true, message: "Report generation started" });
};

export default function Reports() {
  const { reports } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [generating, setGenerating] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const handleGenerateReport = () => {
    setGenerating(true);
    const formData = new FormData();
    formData.append("action", "generate");
    submit(formData, { method: "post" });
    setTimeout(() => setGenerating(false), 3000);
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { tone: any; label: string }> = {
      sales: { tone: "success", label: "Sales" },
      customers: { tone: "info", label: "Customers" },
      inventory: { tone: "warning", label: "Inventory" },
      overview: { tone: "attention", label: "Overview" },
    };
    const badge = badges[type] || { tone: "info", label: type };
    return <Badge tone={badge.tone}>{badge.label}</Badge>;
  };

  return (
    <Page
      title="AI Reports"
      subtitle="AI-generated business intelligence reports"
      primaryAction={
        <Button 
          variant="primary" 
          icon={RefreshIcon}
          onClick={handleGenerateReport}
          loading={generating}
        >
          Generate New Report
        </Button>
      }
    >
      <BlockStack gap="500">
        <Banner tone="info">
          <p>
            Reports are generated daily by AI analyzing your store data. 
            Configure AI settings and schedule in Settings.
          </p>
        </Banner>

        {/* Report Stats */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Total Reports</Text>
                  <Icon source={ReportIcon} tone="info" />
                </InlineStack>
                <Text as="p" variant="heading2xl">{reports.length}</Text>
                <Text as="span" tone="subdued" variant="bodySm">Generated this month</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Total Insights</Text>
                  <Icon source={ChartVerticalIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {reports.reduce((sum: number, r: any) => sum + r.insights.length, 0)}
                </Text>
                <Text as="span" tone="subdued" variant="bodySm">Actionable insights found</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Last Generated</Text>
                  <Icon source={CalendarIcon} tone="info" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {reports.length > 0 
                    ? new Date(reports[0].generatedAt).toLocaleDateString()
                    : "N/A"
                  }
                </Text>
                <Text as="span" tone="subdued" variant="bodySm">Most recent report</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Reports List */}
        {reports.map((report: any) => (
          <Card key={report.id}>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <InlineStack gap="300">
                  <Text as="h2" variant="headingMd">{report.title}</Text>
                  {getTypeBadge(report.type)}
                  <Badge tone="success">Completed</Badge>
                </InlineStack>
                <Text as="span" tone="subdued" variant="bodySm">
                  {new Date(report.generatedAt).toLocaleDateString()}
                </Text>
              </InlineStack>

              <Text as="p">{report.summary}</Text>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">Key Insights</Text>
                {report.insights.map((insight: string, index: number) => (
                  <InlineStack key={index} gap="200" blockAlign="start">
                    <div style={{ minWidth: 6, minHeight: 6, borderRadius: "50%", background: "#5C6AC4", marginTop: 8 }} />
                    <Text as="span">{insight}</Text>
                  </InlineStack>
                ))}
              </BlockStack>

              <InlineStack align="end">
                <Button>View Full Report</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        ))}
      </BlockStack>
    </Page>
  );
}
