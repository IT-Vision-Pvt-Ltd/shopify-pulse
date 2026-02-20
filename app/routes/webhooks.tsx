import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);
  if (!admin) { return new Response(); }
  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) { await db.session.deleteMany({ where: { shop } }); }
      break;
    case "ORDERS_CREATE":
      // Real-time revenue, funnel, and inventory updates
      console.log(`[Webhook] New order created for ${shop}:`, payload?.id);
      break;
    case "ORDERS_UPDATED":
      // Fulfillment pipeline status changes
      console.log(`[Webhook] Order updated for ${shop}:`, payload?.id);
      break;
    case "ORDERS_CANCELLED":
      // Cancellation tracking
      console.log(`[Webhook] Order cancelled for ${shop}:`, payload?.id);
      break;
    case "REFUNDS_CREATE":
      // Return/refund analytics
      console.log(`[Webhook] Refund created for ${shop}:`, payload?.id);
      break;
    case "PRODUCTS_UPDATE":
      // Price and inventory changes
      console.log(`[Webhook] Product updated for ${shop}:`, payload?.id);
      break;
    case "CUSTOMERS_CREATE":
      // New customer acquisition tracking
      console.log(`[Webhook] New customer for ${shop}:`, payload?.id);
      break;
    case "CUSTOMERS_UPDATE":
      // Customer data changes
      console.log(`[Webhook] Customer updated for ${shop}:`, payload?.id);
      break;
    case "INVENTORY_LEVELS_UPDATE":
      // Real-time stock level changes
      console.log(`[Webhook] Inventory level updated for ${shop}`);
      break;
    case "CHECKOUTS_CREATE":
      // Abandoned checkout tracking
      console.log(`[Webhook] Checkout created for ${shop}:`, payload?.id);
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
      break;
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }
  return new Response();
};
