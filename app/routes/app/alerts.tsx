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
  Box,
  Divider,
  Icon,
  Button,
  Banner,
  Checkbox,
} from "@shopify/polaris";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartVerticalIcon,
  InventoryIcon,
  OrderIcon,
  PersonIcon,
  DeleteIcon,
} from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // In production, fetch from database
  const alerts = [
    {
      id: "1",
      type: "inventory",
      severity: "critical",
      title: "Product stock critically low",
      message: "'Wireless Headphones Pro' has only 2 units remaining. Restock recommended immediately.",
      isRead: false,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      type: "sales",
      severity: "info",
      title: "Sales milestone reached",
      message: "Congratulations! Your store has crossed $10,000 in revenue this month.",
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      type: "ai_insight",
      severity: "warning",
      title: "AI detected unusual pattern",
      message: "Cart abandonment rate has increased by 25% in the last 48 hours. Consider reviewing checkout flow.",
      isRead: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "4",
      type: "customer",
      severity: "info",
      title: "New VIP customer identified",
      message: "Customer 'John Smith' has reached VIP status with $520 lifetime spend.",
      isRead: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "5",
      type: "inventory",
      severity: "warning",
      title: "Stock running low on 3 products",
      message: "'Premium T-Shirt', 'Canvas Sneakers', and 'Leather Wallet' are below restock threshold.",
      isRead: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "6",
      type: "ai_insight",
      severity: "success",
      title: "Weekly AI analysis complete",
      message: "Your store performance is trending 18% above last week. Top growth area: organic traffic.",
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "7",
      type: "order",
      severity: "warning",
      title: "Unfulfilled orders increasing",
      message: "You have 8 orders unfulfilled for more than 48 hours. Consider expediting fulfillment.",
      isRead: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  return json({ alerts, stats: { unreadCount, criticalCount, warningCount, total: alerts.length } });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  // Handle mark as read, dismiss, etc.
  return json({ success: true });
};

export default function Alerts() {
  const { alerts, stats } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [filter, setFilter] = useState("all");

  const getAlertIcon = (type: string) => {
    const icons: Record<string, any> = {
      inventory: InventoryIcon,
      sales: ChartVerticalIcon,
      ai_insight: AlertCircleIcon,
      customer: PersonIcon,
      order: OrderIcon,
    };
    return icons[type] || AlertCircleIcon;
  };

  const getSeverityTone = (severity: string) => {
    const tones: Record<string, any> = {
      critical: "critical",
      warning: "warning",
      info: "info",
      success: "success",
    };
    return tones[severity] || "info";
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredAlerts = alerts.filter((alert: any) => {
    if (filter === "all") return true;
    if (filter === "unread") return !alert.isRead;
    return alert.type === filter;
  });

  const handleMarkAllRead = () => {
    const formData = new FormData();
    formData.append("action", "markAllRead");
    submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Alerts & Notifications"
      subtitle="AI-powered alerts and business notifications"
      primaryAction={
        <Button variant="primary" onClick={handleMarkAllRead}>
          Mark All as Read
        </Button>
      }
    >
      <BlockStack gap="500">
        {/* Alert Stats */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Unread</Text>
                  <Icon source={AlertCircleIcon} tone="critical" />
                </InlineStack>
                <Text as="p" variant="heading2xl">{stats.unreadCount}</Text>
                <Text as="span" tone="subdued" variant="bodySm">Alerts pending review</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Critical</Text>
                  <Badge tone="critical">{stats.criticalCount}</Badge>
                </InlineStack>
                <Text as="p" variant="heading2xl">{stats.criticalCount}</Text>
                <Text as="span" tone="subdued" variant="bodySm">Require immediate action</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Total Alerts</Text>
                  <Icon source={ClockIcon} tone="info" />
                </InlineStack>
                <Text as="p" variant="heading2xl">{stats.total}</Text>
                <Text as="span" tone="subdued" variant="bodySm">This week</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Filter Buttons */}
        <Card>
          <InlineStack gap="200">
            <Button pressed={filter === "all"} onClick={() => setFilter("all")}>
              All ({alerts.length})
            </Button>
            <Button pressed={filter === "unread"} onClick={() => setFilter("unread")}>
              Unread ({stats.unreadCount})
            </Button>
            <Button pressed={filter === "inventory"} onClick={() => setFilter("inventory")}>
              Inventory
            </Button>
            <Button pressed={filter === "ai_insight"} onClick={() => setFilter("ai_insight")}>
              AI Insights
            </Button>
            <Button pressed={filter === "sales"} onClick={() => setFilter("sales")}>
              Sales
            </Button>
            <Button pressed={filter === "order"} onClick={() => setFilter("order")}>
              Orders
            </Button>
          </InlineStack>
        </Card>

        {/* Alerts List */}
        <BlockStack gap="300">
          {filteredAlerts.map((alert: any) => (
            <Card key={alert.id}>
              <InlineStack align="space-between" blockAlign="start">
                <InlineStack gap="400" blockAlign="start">
                  <div style={{
                    padding: 8,
                    borderRadius: 8,
                    background: alert.severity === "critical" ? "#FED3D1" :
                               alert.severity === "warning" ? "#FFEA8A" :
                               alert.severity === "success" ? "#AEE9D1" : "#B4E1FA",
                  }}>
                    <Icon source={getAlertIcon(alert.type)} tone={getSeverityTone(alert.severity)} />
                  </div>
                  <BlockStack gap="100">
                    <InlineStack gap="200">
                      <Text as="h3" variant="headingSm" fontWeight={alert.isRead ? "regular" : "bold"}>
                        {alert.title}
                      </Text>
                      {!alert.isRead && <Badge tone="info">New</Badge>}
                      <Badge tone={getSeverityTone(alert.severity)}>
                        {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                      </Badge>
                    </InlineStack>
                    <Text as="p" tone="subdued">{alert.message}</Text>
                    <Text as="span" tone="subdued" variant="bodySm">
                      {getTimeAgo(alert.createdAt)}
                    </Text>
                  </BlockStack>
                </InlineStack>
                <Button icon={DeleteIcon} variant="plain" tone="critical" />
              </InlineStack>
            </Card>
          ))}
        </BlockStack>
      </BlockStack>
    </Page>
  );
}
