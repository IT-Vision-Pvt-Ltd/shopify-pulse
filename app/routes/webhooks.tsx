import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);
  if (!admin && topic !== "CUSTOMERS_DATA_REQUEST" && topic !== "CUSTOMERS_REDACT" && topic !== "SHOP_REDACT") {
    return new Response();
  }

  try {
    switch (topic) {
      case "APP_UNINSTALLED":
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
        // Mark shop as uninstalled
        await db.shop.updateMany({
          where: { shopifyDomain: shop },
          data: { isActive: false, uninstalledAt: new Date() },
        });
        break;

      case "ORDERS_CREATE":
      case "ORDERS_UPDATED":
      case "ORDERS_CANCELLED":
      case "REFUNDS_CREATE":
        await db.webhookLog.create({
          data: {
            topic,
            payload: JSON.stringify(payload || {}),
            status: "processed",
          },
        });
        await db.analyticsCache.deleteMany({
          where: {
            shopId: (await db.shop.findUnique({ where: { shopifyDomain: shop } }))?.id || "",
            type: { in: ["sales", "orders"] },
          },
        }).catch(() => {});
        break;

      case "PRODUCTS_UPDATE":
      case "INVENTORY_LEVELS_UPDATE":
        await db.webhookLog.create({
          data: {
            topic,
            payload: JSON.stringify(payload || {}),
            status: "processed",
          },
        });
        await db.analyticsCache.deleteMany({
          where: {
            shopId: (await db.shop.findUnique({ where: { shopifyDomain: shop } }))?.id || "",
            type: { in: ["products", "inventory"] },
          },
        }).catch(() => {});
        break;

      case "CUSTOMERS_CREATE":
      case "CUSTOMERS_UPDATE":
        await db.webhookLog.create({
          data: {
            topic,
            payload: JSON.stringify(payload || {}),
            status: "processed",
          },
        });
        break;

      case "CHECKOUTS_CREATE":
        await db.webhookLog.create({
          data: {
            topic,
            payload: JSON.stringify(payload || {}),
            status: "processed",
          },
        });
        break;

      case "CUSTOMERS_DATA_REQUEST":
        console.log(`[GDPR] Customer data request for ${shop}`, payload);
        await db.webhookLog.create({
          data: { topic, payload: JSON.stringify(payload || {}), status: "processed" },
        });
        break;

      case "CUSTOMERS_REDACT":
        console.log(`[GDPR] Customer redact request for ${shop}`, payload);
        await db.webhookLog.create({
          data: { topic, payload: JSON.stringify(payload || {}), status: "processed" },
        });
        break;

      case "SHOP_REDACT":
        console.log(`[GDPR] Shop redact request for ${shop}`);
        const shopRecord = await db.shop.findUnique({ where: { shopifyDomain: shop } });
        if (shopRecord) {
          await db.shop.delete({ where: { id: shopRecord.id } });
        }
        await db.session.deleteMany({ where: { shop } });
        break;

      default:
        throw new Response("Unhandled webhook topic", { status: 404 });
    }
  } catch (error) {
    console.error(`[Webhook] Error processing ${topic} for ${shop}:`, error);
    await db.webhookLog.create({
      data: { topic, payload: JSON.stringify(payload || {}), status: "failed", error: String(error) },
    }).catch(() => {});
  }

  return new Response();
};
