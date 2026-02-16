import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Box,
  Divider,
  Icon,
  Button,
  Banner,
  ProgressBar,
  Spinner,
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  LightbulbIcon,
  RefreshIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@shopify/polaris-icons";
import { useState } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // In production, fetch from database and AI service
  const aiInsights = {
    lastAnalysis: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    nextAnalysis: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    aiModel: "GPT-4",
    overallScore: 78,
    categories: [
      {
        name: "Sales Performance",
        score: 85,
        trend: "up",
        insights: [
          "Revenue is 15% above your monthly average",
          "Tuesday and Wednesday are your best performing days",
          "Consider running promotions on slower weekends",
        ],
        recommendations: [
          "Launch a mid-week flash sale to capitalize on peak traffic",
          "Bundle slow-moving products with bestsellers",
        ],
      },
      {
        name: "Customer Behavior",
        score: 72,
        trend: "stable",
        insights: [
          "Cart abandonment rate is 68% (industry avg: 70%)",
          "Average time to purchase: 3.2 days",
          "Mobile users convert 23% less than desktop",
        ],
        recommendations: [
          "Implement exit-intent popups with discount offers",
          "Optimize mobile checkout flow",
          "Send abandoned cart emails within 1 hour",
        ],
      },
      {
        name: "Inventory Health",
        score: 65,
        trend: "down",
        insights: [
          "3 products are at critical stock levels",
          "Overstock detected on 5 products (120+ days supply)",
          "Seasonal demand shift expected in 2 weeks",
        ],
        recommendations: [
          "Reorder 'Wireless Headphones' immediately - 5 day stockout risk",
          "Run clearance sale on overstocked items",
          "Increase winter category inventory by 30%",
        ],
      },
      {
        name: "Growth Opportunities",
        score: 88,
        trend: "up",
        insights: [
          "Untapped market segment identified: 25-34 age group",
          "Cross-sell opportunities: 40% of customers buy single items",
          "Email list growth rate: +12% this month",
        ],
        recommendations: [
          "Create targeted ads for 25-34 demographic on Instagram",
          "Implement 'Frequently bought together' feature",
          "Launch referral program to accelerate growth",
        ],
      },
    ],
    actionItems: [
      { priority: "high", action: "Restock Wireless Headphones Pro", deadline: "Within 3 days" },
      { priority: "high", action: "Review checkout flow for mobile users", deadline: "This week" },
      { priority: "medium", action: "Set up abandoned cart automation", deadline: "Within 2 weeks" },
      { priority: "medium", action: "Plan winter inventory increase", deadline: "Within 2 weeks" },
      { priority: "low", action: "Explore Instagram ad campaign", deadline: "This month" },
    ],
  };

  return json({ aiInsights });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  // Trigger new AI analysis
  return json({ success: true, message: "AI analysis started" });
};

export default function AIInsights() {
  const { aiInsights } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [analyzing, setAnalyzing] = useState(false);

  const handleRunAnalysis = () => {
    setAnalyzing(true);
    const formData = new FormData();
    formData.append("action", "analyze");
    submit(formData, { method: "post" });
    setTimeout(() => setAnalyzing(false), 5000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "critical";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <Badge tone="success">↑ Improving</Badge>;
    if (trend === "down") return <Badge tone="critical">↓ Needs Attention</Badge>;
    return <Badge tone="info">→ Stable</Badge>;
  };

  return (
    <Page
      title="AI Insights"
      subtitle="AI-powered business analysis and recommendations"
      primaryAction={
        <Button
          variant="primary"
          icon={RefreshIcon}
          onClick={handleRunAnalysis}
          loading={analyzing}
        >
          Run New Analysis
        </Button>
      }
    >
      <BlockStack gap="500">
        {/* Analysis Status */}
        <Banner tone="info">
          <InlineStack gap="400" blockAlign="center">
            <Text as="p">
              Last analysis: {new Date(aiInsights.lastAnalysis).toLocaleString()} using {aiInsights.aiModel}
            </Text>
            <Text as="span" tone="subdued">|
            </Text>
            <Text as="p">
              Next scheduled: {new Date(aiInsights.nextAnalysis).toLocaleString()}
            </Text>
          </InlineStack>
        </Banner>

        {/* Overall Score */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <BlockStack gap="100">
                <Text as="h2" variant="headingLg">Overall Business Health Score</Text>
                <Text as="p" tone="subdued">Based on AI analysis of your store data</Text>
              </BlockStack>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: aiInsights.overallScore >= 80 ? "#AEE9D1" :
                           aiInsights.overallScore >= 60 ? "#FFEA8A" : "#FED3D1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text as="p" variant="heading2xl" fontWeight="bold">
                  {aiInsights.overallScore}
                </Text>
              </div>
            </InlineStack>
            <ProgressBar
              progress={aiInsights.overallScore}
              tone={getScoreColor(aiInsights.overallScore)}
              size="small"
            />
          </BlockStack>
        </Card>

        {/* Priority Action Items */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Priority Action Items</Text>
              <Badge tone="attention">{aiInsights.actionItems.length} items</Badge>
            </InlineStack>
            <Divider />
            <BlockStack gap="300">
              {aiInsights.actionItems.map((item: any, index: number) => (
                <InlineStack key={index} align="space-between" blockAlign="center">
                  <InlineStack gap="300" blockAlign="center">
                    <Badge tone={item.priority === "high" ? "critical" : item.priority === "medium" ? "warning" : "info"}>
                      {item.priority.toUpperCase()}
                    </Badge>
                    <Text as="span">{item.action}</Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Icon source={ClockIcon} tone="subdued" />
                    <Text as="span" tone="subdued" variant="bodySm">{item.deadline}</Text>
                  </InlineStack>
                </InlineStack>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Category Analysis */}
        <Layout>
          {aiInsights.categories.map((category: any, index: number) => (
            <Layout.Section key={index} variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">{category.name}</Text>
                      {getTrendIcon(category.trend)}
                    </BlockStack>
                    <div style={{
                      padding: "8px 16px",
                      borderRadius: 20,
                      background: category.score >= 80 ? "#AEE9D1" :
                                 category.score >= 60 ? "#FFEA8A" : "#FED3D1",
                    }}>
                      <Text as="span" fontWeight="bold">{category.score}/100</Text>
                    </div>
                  </InlineStack>

                  <ProgressBar
                    progress={category.score}
                    tone={getScoreColor(category.score)}
                    size="small"
                  />

                  <Divider />

                  <BlockStack gap="200">
                    <InlineStack gap="200">
                      <Icon source={LightbulbIcon} tone="info" />
                      <Text as="h3" variant="headingSm">Key Insights</Text>
                    </InlineStack>
                    {category.insights.map((insight: string, i: number) => (
                      <InlineStack key={i} gap="200" blockAlign="start">
                        <div style={{ minWidth: 6, minHeight: 6, borderRadius: "50%", background: "#5C6AC4", marginTop: 8 }} />
                        <Text as="span" variant="bodySm">{insight}</Text>
                      </InlineStack>
                    ))}
                  </BlockStack>

                  <BlockStack gap="200">
                    <InlineStack gap="200">
                      <Icon source={CheckCircleIcon} tone="success" />
                      <Text as="h3" variant="headingSm">Recommendations</Text>
                    </InlineStack>
                    {category.recommendations.map((rec: string, i: number) => (
                      <InlineStack key={i} gap="200" blockAlign="start">
                        <div style={{ minWidth: 6, minHeight: 6, borderRadius: "50%", background: "#50B83C", marginTop: 8 }} />
                        <Text as="span" variant="bodySm">{rec}</Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          ))}
        </Layout>
      </BlockStack>
    </Page>
  );
}
