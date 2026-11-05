import { ensure } from "./security.js";

// Read-only data integration; never ingests orders or writes to the money ledger.
export async function catalogRoutes({
  service,
  path,
  method,
  body,
  url,
  needUser,
  send,
}) {
  if (!path.startsWith("/api/catalog/")) return false;
  needUser();
  if (method === "GET" && path === "/api/catalog/product") {
    send(
      await service.inspect(
        url.searchParams.get("url") || url.searchParams.get("itemId"),
      ),
    );
  } else if (method === "GET" && path === "/api/catalog/offers") {
    const q = url.searchParams;
    send(
      await service.offers({
        kind: q.get("kind") || "products",
        keyword: q.get("keyword") || "",
        page: Number(q.get("page") || 1),
        limit: Number(q.get("limit") || 20),
        sortType: Number(q.get("sortType") || 1),
        shopId: q.get("shopId"),
      }),
    );
  } else if (method === "GET" && path === "/api/catalog/history") {
    const q = url.searchParams;
    send(
      await service.history((q.get("itemIds") || "").split(","), {
        type: q.get("type") || "price",
        days: Number(q.get("days") || 90),
      }),
    );
  } else if (method === "POST" && path === "/api/catalog/products/batch") {
    ensure(
      body.cacheOnly === undefined || typeof body.cacheOnly === "boolean",
      "cacheOnly phải là boolean.",
    );
    send(
      await service.batch(body.itemIds, {
        cacheOnly: body.cacheOnly,
        maxApi: body.maxApi,
      }),
    );
  } else return false;
  return true;
}
