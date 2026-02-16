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
  List,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  CashDollarIcon,
  StarIcon,
  ClockIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);

  // In production, check actual billing status from Shopify Billing API
  const currentPlan = {
    name: "Free",
    status: "active",
    trialDays: 14,
    trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const plans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      interval: "month",
      features: [
        "Basic dashboard analytics",
        "Up to 100 orders/month tracking",
        "Daily email summary",
        "1 AI report per week",
        "Basic inventory alerts",
      ],
      limitations: [
        "Limited to 100 orders/month",
        "No custom AI prompts",
        "No export functionality",
        "Community support only",
      ],
      isCurrent: true,
    },
    {
      id: "growth",
      name: "Growth",
      price: 29.99,
      interval: "month",
      features: [
        "Full dashboard analytics",
        "Unlimited orders tracking",
        "Real-time AI insights",
        "Daily AI business reports",
        "Advanced inventory forecasting",
        "Customer segmentation",
        "Export to CSV/PDF",
        "Priority email support",
        "Custom alert thresholds",
      ],
      limitations: [],
      isCurrent: false,
      recommended: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 99.99,
      interval: "month",
      features: [
        "Everything in Growth",
        "Multi-store management",
        "Custom AI model training",
        "Advanced forecasting models",
        "White-label reports",
        "API access",
        "Dedicated account manager",
        "24/7 priority support",
        "Custom integrations",
        "SLA guarantee",
      ],
      limitations: [],
      isCurrent: false,
    },
  ];

  return json({ currentPlan, plans });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const planId = formData.get("planId") as string;

  // In production, use Shopify Billing API to create charge
  // const charge = await billing.request({
  //   plan: planId,
  //   isTest: true,
  // });

  return json({ success: true, message: `Upgrade to ${planId} initiated` });
};

export default function Billing() {
  const { currentPlan, plans } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const handleUpgrade = (planId: string) => {
    const formData = new FormData();
    formData.append("planId", planId);
    submit(formData, { method: "post" });
  };

  const daysRemaining = currentPlan.trialEndsAt 
    ? Math.max(0, Math.ceil((new Date(currentPlan.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <Page
      title="Billing & Subscription"
      subtitle="Manage your GrowthPilot AI subscription"
    >
      <BlockStack gap="500">
        {/* Trial Banner */}
        {currentPlan.name === "Free" && daysRemaining > 0 && (
          <Banner tone="warning">
            <p>
              Your free trial has <strong>{daysRemaining} days</strong> remaining. 
              Upgrade to Growth plan to keep all features after the trial ends.
            </p>
          </Banner>
        )}

        {/* Current Plan */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <BlockStack gap="100">
                <Text as="h2" variant="headingLg">Current Plan</Text>
                <InlineStack gap="200">
                  <Badge tone="success">{currentPlan.name}</Badge>
                  <Badge tone="info">{currentPlan.status}</Badge>
                  {daysRemaining > 0 && (
                    <Badge tone="warning">{daysRemaining} days left in trial</Badge>
                  )}
                </InlineStack>
              </BlockStack>
              <Icon source={CashDollarIcon} tone="success" />
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Pricing Plans */}
        <Layout>
          {plans.map((plan: any) => (
            <Layout.Section key={plan.id} variant="oneThird">
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="h2" variant="headingLg">{plan.name}</Text>
                      {plan.recommended && <Badge tone="success">Recommended</Badge>}
                      {plan.isCurrent && <Badge tone="info">Current</Badge>}
                    </InlineStack>
                    <InlineStack gap="100" blockAlign="baseline">
                      <Text as="p" variant="heading2xl">
                        ${plan.price}
                      </Text>
                      <Text as="span" tone="subdued">/month</Text>
                    </InlineStack>
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Features</Text>
                    {plan.features.map((feature: string, index: number) => (
                      <InlineStack key={index} gap="200" blockAlign="start">
                        <div style={{ marginTop: 2 }}>
                          <Icon source={CheckCircleIcon} tone="success" />
                        </div>
                        <Text as="span" variant="bodySm">{feature}</Text>
                      </InlineStack>
                    ))}
                  </BlockStack>

                  {plan.limitations.length > 0 && (
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" tone="subdued">Limitations</Text>
                      {plan.limitations.map((limitation: string, index: number) => (
                        <InlineStack key={index} gap="200" blockAlign="start">
                          <Text as="span" tone="subdued" variant="bodySm">• {limitation}</Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  )}

                  <Box paddingBlockStart="200">
                    {plan.isCurrent ? (
                      <Button disabled fullWidth>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        variant={plan.recommended ? "primary" : "secondary"}
                        fullWidth
                        onClick={() => handleUpgrade(plan.id)}
                        loading={isSubmitting}
                      >
                        {plan.price === 0 ? "Downgrade" : `Upgrade to ${plan.name}`}
                      </Button>
                    )}
                  </Box>
                </BlockStack>
              </Card>
            </Layout.Section>
          ))}
        </Layout>

        {/* Billing FAQ */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Frequently Asked Questions</Text>
            <Divider />
            <BlockStack gap="300">
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">How does billing work?</Text>
                <Text as="p" tone="subdued">
                  All payments are processed through Shopify's billing system. 
                  Charges appear on your Shopify invoice.
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">Can I cancel anytime?</Text>
                <Text as="p" tone="subdued">
                  Yes, you can downgrade or cancel your subscription at any time. 
                  Changes take effect at the end of your current billing cycle.
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">What happens after the free trial?</Text>
                <Text as="p" tone="subdued">
                  After your 14-day free trial, you'll automatically be moved to the Free plan 
                  with limited features. Upgrade anytime to unlock full capabilities.
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">Do you offer refunds?</Text>
                <Text as="p" tone="subdued">
                  We offer a 30-day money-back guarantee on all paid plans. 
                  Contact support for assistance.
                </Text>
              </BlockStack>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
