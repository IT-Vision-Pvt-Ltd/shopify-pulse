import { AdminApiContext } from "@shopify/shopify-app-remix/server";

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: "EVERY_30_DAYS" | "ANNUAL";
  features: string[];
  aiAnalysesPerMonth: number;
  trialDays: number;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "EVERY_30_DAYS",
    features: [
      "Basic analytics dashboard",
      "5 AI analyses per month",
      "7-day data history",
      "Email support",
    ],
    aiAnalysesPerMonth: 5,
    trialDays: 0,
  },
  {
    id: "starter",
    name: "Starter",
    price: 19.99,
    interval: "EVERY_30_DAYS",
    features: [
      "Advanced analytics",
      "50 AI analyses per month",
      "30-day data history",
      "Daily AI reports",
      "Priority email support",
    ],
    aiAnalysesPerMonth: 50,
    trialDays: 14,
  },
  {
    id: "professional",
    name: "Professional",
    price: 49.99,
    interval: "EVERY_30_DAYS",
    features: [
      "Full analytics suite",
      "Unlimited AI analyses",
      "90-day data history",
      "Custom AI prompts",
      "API access",
      "Priority support",
    ],
    aiAnalysesPerMonth: -1, // unlimited
    trialDays: 14,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 149.99,
    interval: "EVERY_30_DAYS",
    features: [
      "Everything in Professional",
      "White-label reports",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom AI training",
    ],
    aiAnalysesPerMonth: -1,
    trialDays: 14,
  },
];

export async function createSubscription(
  admin: AdminApiContext["admin"],
  shop: string,
  plan: Plan,
  returnUrl: string
) {
  if (plan.price === 0) {
    return { confirmationUrl: returnUrl, id: null };
  }

  const response = await admin.graphql(`
    mutation CreateSubscription($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        trialDays: $trialDays
        lineItems: $lineItems
        test: true
      ) {
        appSubscription {
          id
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      name: `GrowthPilot AI - ${plan.name}`,
      returnUrl: returnUrl,
      trialDays: plan.trialDays,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: plan.price,
                currencyCode: "USD",
              },
              interval: plan.interval,
            },
          },
        },
      ],
    },
  });

  const data = await response.json();
  
  if (data.data?.appSubscriptionCreate?.userErrors?.length > 0) {
    throw new Error(data.data.appSubscriptionCreate.userErrors[0].message);
  }

  return {
    confirmationUrl: data.data?.appSubscriptionCreate?.confirmationUrl,
    id: data.data?.appSubscriptionCreate?.appSubscription?.id,
  };
}

export async function getActiveSubscription(
  admin: AdminApiContext["admin"]
) {
  const response = await admin.graphql(`
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          trialDays
          currentPeriodEnd
          lineItems {
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await response.json();
  const subscriptions = data.data?.currentAppInstallation?.activeSubscriptions || [];
  
  return subscriptions.length > 0 ? subscriptions[0] : null;
}

export async function cancelSubscription(
  admin: AdminApiContext["admin"],
  subscriptionId: string
) {
  const response = await admin.graphql(`
    mutation CancelSubscription($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: { id: subscriptionId },
  });

  const data = await response.json();
  return data.data?.appSubscriptionCancel;
}

export function getPlanById(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}

export function canUseAIAnalysis(plan: Plan, usedThisMonth: number): boolean {
  if (plan.aiAnalysesPerMonth === -1) return true;
  return usedThisMonth < plan.aiAnalysesPerMonth;
}
