import { AppError, ensure, integer, shopeeUrl } from "../security.js";

const BASE = "https://data.addlivetag.com";
const ENDPOINTS = {
  product: "/product-data/product-data.php",
  batch: "/product-data/product-data-batch.php",
  history: "/price-tracking/history.php",
  products: "/offers/product-offer.php",
  campaigns: "/offers/shopee-offer.php",
  shops: "/offers/shop-offer.php",
  shopProducts: "/offers/shop-products.php",
};
export function itemId(value) {
  const str = String(value ?? "");
  ensure(
    typeof value !== "number" || Number.isSafeInteger(value),
    "Mã sản phẩm vượt giới hạn số an toàn; hãy gửi dạng chuỗi.",
  );
  ensure(/^[1-9]\d{0,19}$/.test(str), "Mã sản phẩm không hợp lệ.");
  return str;
}
// No remote redirect resolution: only canonical product URLs are accepted here.
// This avoids SSRF and the provider's slow/limited short-link resolver.
export function productIdentity(value) {
  if (/^[1-9]\d{0,19}$/.test(String(value ?? "")))
    return { itemId: itemId(value) };
  const url = new URL(shopeeUrl(value));
  ensure(
    ["shopee.vn", "www.shopee.vn"].includes(url.hostname),
    "Hãy mở link rút gọn trên Shopee rồi sao chép link sản phẩm đầy đủ để tra cứu dữ liệu.",
  );
  const match =
    url.pathname.match(/^\/product\/(\d+)\/(\d+)\/?$/) ||
    url.pathname.match(/-i\.(\d+)\.(\d+)\/?$/);
  ensure(
    match,
    "Cần link sản phẩm dạng /product/shop_id/item_id hoặc -i.shop_id.item_id.",
  );
  const shopId = itemId(match[1]),
    id = itemId(match[2]);
  return {
    itemId: id,
    shopId,
    url: `https://shopee.vn/product/${shopId}/${id}`,
  };
}
export function productImage(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      (u.hostname.endsWith(".susercontent.com") ||
        u.hostname === "cf.shopee.vn")
      ? u.href
      : null;
  } catch {
    return null;
  }
}
const number = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  ["number", "string"].includes(typeof value) &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0
    ? Number(value)
    : null;
const label = (value) =>
  typeof value === "string" ? value.slice(0, 500) : null;
const numericFields = (value, fields) =>
  Object.fromEntries(fields.map((field) => [field, number(value?.[field])]));
const safeStats = (value) =>
  numericFields(value, [
    "min",
    "max",
    "avg",
    "first",
    "last",
    "changeCount",
    "dayCount",
    "sellerRateChangeCount",
    "shopeeRateRecordedChangeCount",
  ]);
function canonical(value, fallback) {
  try {
    return productIdentity(value).url || fallback || null;
  } catch {
    return fallback || null;
  }
}
function product(raw = {}, source, fallbackUrl) {
  return {
    itemId: String(raw.itemId ?? ""),
    title: label(raw.productName ?? raw.name),
    shopName: label(raw.shopName),
    image: productImage(raw.imageUrl ?? raw.image),
    url: canonical(raw.productLink ?? raw.link, fallbackUrl),
    price: number(raw.price),
    sales: number(raw.sales),
    rating: number(raw.rating),
    // A proxy account's commission is not the buyer's cashback or this publisher's entitlement.
    commission:
      source === "fallback" || raw.shopeeRateSource === "none"
        ? null
        : number(raw.commission),
    ratePercent:
      source === "fallback"
        ? null
        : (number(raw.totalRatePercent) ??
          (number(raw.commissionRate) === null
            ? null
            : number(raw.commissionRate) * 100)),
    dataSource: ["api", "db", "fallback"].includes(source) ? source : "unknown",
  };
}
function ids(values, max) {
  ensure(
    Array.isArray(values) && values.length > 0 && values.length <= max,
    `Cần từ 1 đến ${max} mã sản phẩm.`,
  );
  return values.map((value) => productIdentity(value).itemId);
}
// Pure helper only. Not enabled as a purchase flow: the account and tracking must
// first be approved/verified independently of this third-party documentation.
export function buildAffiliateLink(value, affiliateId, subs = []) {
  const { url } = productIdentity(value);
  ensure(url, "Cần link sản phẩm đầy đủ để tạo liên kết.");
  ensure(
    /^[1-9]\d{0,19}$/.test(String(affiliateId)),
    "Cần Affiliate ID của chính bạn.",
  );
  ensure(
    Array.isArray(subs) &&
      subs.length <= 5 &&
      subs.every(
        (s) => typeof s === "string" && /^[a-zA-Z0-9_]{0,50}$/.test(s),
      ),
    "Sub ID gồm tối đa 5 phần chữ, số hoặc dấu gạch dưới.",
  );
  const result = new URL("https://s.shopee.vn/an_redir");
  result.searchParams.set("origin_link", url);
  result.searchParams.set("affiliate_id", String(affiliateId));
  if (subs.length) result.searchParams.set("sub_id", subs.join("-"));
  return result.href;
}
export function createAddLiveTag({
  apiKey = process.env.ADDLIVETAG_API_KEY || "",
  baseRate = process.env.ADDLIVETAG_BASE_RATE,
  cap = process.env.ADDLIVETAG_CAP,
  fetchImpl = fetch,
  clock = Date.now,
  timeoutMs = 8000,
} = {}) {
  apiKey = apiKey.trim();
  ensure(
    !apiKey || /^[a-fA-F0-9]{48}$/.test(apiKey),
    "ADDLIVETAG_API_KEY phải gồm 48 ký tự hex.",
  );
  const tier = {};
  if (baseRate !== undefined && baseRate !== "") {
    const rate = Number(baseRate);
    ensure(
      Number.isFinite(rate) && rate >= 0 && rate <= 100,
      "ADDLIVETAG_BASE_RATE cần nằm trong khoảng 0–100.",
    );
    tier.base_rate = rate;
  }
  if (cap !== undefined && cap !== "")
    tier.cap = integer(Number(cap), "ADDLIVETAG_CAP", 0, 1000000000);
  const cache = new Map(),
    pending = new Map();
  let cooldownUntil = 0,
    active = 0,
    windowAt = clock(),
    budget = 0,
    cacheBytes = 0;
  const capabilities = {
    configured: !!apiKey,
    source: "addlivetag",
    nonCommercial: true,
    affiliateLinks: false,
  };
  async function request(kind, params, ttl = 600000, cost = 1) {
    ensure(
      apiKey,
      "Chưa kết nối dữ liệu sản phẩm. Quản trị viên cần cấu hình ADDLIVETAG_API_KEY trên máy chủ.",
      503,
    );
    const key = kind + JSON.stringify(params),
      cached = cache.get(key),
      time = clock();
    if (cached && cached.expires > time)
      return { ...cached.data, cached: true };
    if (pending.has(key)) return pending.get(key);
    const stale = () =>
      cached && time - cached.at < 86400000
        ? {
            ...cached.data,
            cached: true,
            stale: true,
            warning:
              "Đang hiển thị bản lưu cũ vì nguồn chưa thể cập nhật. Hãy kiểm tra lại giá trên Shopee.",
          }
        : null;
    if (cooldownUntil > time) {
      if (stale()) return stale();
      const err = new AppError(
        "Nguồn dữ liệu đang tạm nghỉ do giới hạn truy cập. Vui lòng thử lại sau.",
        429,
      );
      err.retryAfter = Math.ceil((cooldownUntil - time) / 1000);
      throw err;
    }
    if (time - windowAt >= 60000) {
      windowAt = time;
      budget = 0;
    }
    ensure(
      active < 3 && budget + cost <= 60,
      "Đã đạt giới hạn tra cứu của bản demo. Vui lòng thử lại sau một phút.",
      429,
    );
    budget += cost;
    active++;
    const job = (async () => {
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const url = new URL(ENDPOINTS[kind], BASE);
        for (const [k, v] of Object.entries(params))
          url.searchParams.set(
            k,
            Array.isArray(v) ? JSON.stringify(v) : String(v),
          );
        const response = await fetchImpl(url, {
          headers: { "X-API-Key": apiKey, Accept: "application/json" },
          redirect: "error",
          signal: controller.signal,
        });
        if (response.status === 429) {
          const retry = response.headers.get("retry-after");
          const seconds = /^\d+$/.test(retry || "")
            ? Number(retry)
            : (Date.parse(retry) - clock()) / 1000;
          const wait = Math.min(
            3600,
            Math.max(120, Number.isFinite(seconds) ? seconds : 120),
          );
          cooldownUntil = clock() + wait * 1000;
          const err = new AppError(
            "Nguồn dữ liệu đã giới hạn truy cập. Vui lòng thử lại sau.",
            429,
          );
          err.retryAfter = Math.ceil(wait);
          throw err;
        }
        ensure(
          response.status !== 401 && response.status !== 403,
          "API Key dữ liệu không hợp lệ hoặc chưa được cấp quyền. Quản trị viên cần kiểm tra cấu hình.",
          503,
        );
        ensure(response.ok, "Nguồn dữ liệu tạm thời không phản hồi.", 502);
        const chunks = [];
        let size = 0;
        for await (const chunk of response.body) {
          size += chunk.length;
          if (size > 2000000) {
            controller.abort();
            throw new AppError("Phản hồi dữ liệu quá lớn.", 502);
          }
          chunks.push(chunk);
        }
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        ensure(
          data && data.status === "success",
          "Nguồn dữ liệu chưa trả được kết quả hợp lệ.",
          502,
        );
        ensure(
          !data.apiKeyNotice,
          "API Key dữ liệu chưa được xác nhận. Quản trị viên cần kiểm tra cấu hình.",
          503,
        );
        if (
          data.limits?.sourceRateLimited ||
          Number(data.limits?.sourceCooldownSeconds) > 0
        )
          cooldownUntil =
            clock() +
            Math.max(
              120,
              Math.min(3600, Number(data.limits.sourceCooldownSeconds) || 120),
            ) *
              1000;
        const result = {
          ...data,
          fetchedAt: new Date(clock()).toISOString(),
          cached: false,
        };
        const removeCached = (entryKey) => {
          cacheBytes -= cache.get(entryKey)?.size || 0;
          cache.delete(entryKey);
        };
        if (cache.has(key)) removeCached(key);
        while (
          cache.size &&
          (cache.size >= 200 || cacheBytes + size > 20000000)
        )
          removeCached(cache.keys().next().value);
        const partial =
          !!data.limits?.sourceRateLimited ||
          Number(data.limits?.sourceCooldownSeconds) > 0;
        cache.set(key, {
          data: result,
          expires: clock() + (partial ? 120000 : ttl),
          at: clock(),
          size,
        });
        cacheBytes += size;
        return result;
      } catch (err) {
        if (err.status !== 503 && stale()) return stale();
        if (err instanceof AppError) throw err;
        throw new AppError(
          controller.signal.aborted
            ? "Tra cứu quá thời gian chờ. Vui lòng thử lại sau."
            : "Không thể đọc nguồn dữ liệu. Vui lòng thử lại sau.",
          502,
        );
      } finally {
        clearTimeout(timer);
        active--;
      }
    })();
    pending.set(key, job);
    try {
      return await job;
    } finally {
      pending.delete(key);
    }
  }
  const meta = (data) => ({
    source: "addlivetag",
    fetchedAt: data.fetchedAt,
    cached: data.cached,
    stale: !!data.stale,
    warning: data.warning
      ? "Dữ liệu có thể đã cũ hoặc chưa đầy đủ; hãy kiểm tra lại trên Shopee."
      : null,
    commissionBasis: tier.base_rate === undefined ? "proxy" : "configured_tier",
    referenceOnly: true,
  });
  return {
    capabilities,
    async inspect(value) {
      const identity = productIdentity(value);
      const data = await request("product", {
        item_id: identity.itemId,
        ...tier,
      });
      ensure(
        data.productInfo && typeof data.productInfo === "object",
        "Chưa có dữ liệu sản phẩm này.",
        502,
      );
      ensure(
        String(data.productInfo.itemId) === identity.itemId,
        "Nguồn trả dữ liệu khác mã sản phẩm yêu cầu.",
        502,
      );
      return {
        ...meta(data),
        product: product(
          data.productInfo,
          data.productInfo.dataSource || data.dataSource,
          identity.url,
        ),
        message:
          "Giá và hoa hồng từ nguồn tham khảo AddLiveTag, không phải tiền hoàn đã được xác nhận.",
      };
    },
    async batch(values, { cacheOnly = false, maxApi = 10 } = {}) {
      const valuesIds = ids(values, 100);
      integer(maxApi, "Số sản phẩm gọi nguồn", 0, 50);
      const data = await request(
        "batch",
        {
          item_ids: valuesIds,
          ...tier,
          max_api: cacheOnly ? 0 : maxApi,
          ...(cacheOnly ? { cache_only: 1 } : {}),
        },
        600000,
        Math.max(1, Math.ceil(valuesIds.length / 20), cacheOnly ? 0 : maxApi),
      );
      ensure(
        Array.isArray(data.products) &&
          data.products.length === valuesIds.length,
        "Danh sách sản phẩm trả về không đầy đủ.",
        502,
      );
      return {
        ...meta(data),
        summary: numericFields(data.summary, [
          "fromCache",
          "fromApi",
          "stale",
          "skipped",
          "notFound",
          "invalid",
        ]),
        limits: {
          ...numericFields(data.limits, [
            "maxItems",
            "maxApiPerRequest",
            "apiFetched",
            "sourceCooldownSeconds",
          ]),
          sourceRateLimited: !!data.limits?.sourceRateLimited,
        },
        products: data.products.map((row, i) => ({
          itemId: valuesIds[i],
          status: row.status,
          reason: row.reason,
          product: row.productInfo
            ? product(row.productInfo, row.dataSource)
            : null,
        })),
      };
    },
    async offers({
      kind = "products",
      keyword = "",
      page = 1,
      limit = 20,
      sortType = 1,
      shopId,
    } = {}) {
      ensure(
        ["products", "campaigns", "shops", "shopProducts"].includes(kind),
        "Loại danh sách không hợp lệ.",
      );
      ensure(
        typeof keyword === "string" && keyword.length <= 100,
        "Từ khóa tối đa 100 ký tự.",
      );
      integer(page, "Trang", 1, 100);
      integer(limit, "Số kết quả", 1, 50);
      integer(sortType, "Sắp xếp", 1, 6);
      const params = {
        page,
        limit,
        sortType,
        ...(kind === "shopProducts"
          ? { shopId: itemId(shopId) }
          : { keyword: keyword.trim() }),
      };
      const data = await request(kind, params);
      const field =
        kind === "shops"
          ? "shops"
          : kind === "campaigns"
            ? "offers"
            : "products";
      ensure(
        Array.isArray(data[field]),
        "Danh sách từ nguồn không hợp lệ.",
        502,
      );
      return {
        ...meta(data),
        page,
        limit,
        hasNextPage: data.hasNextPage === true,
        [field]: data[field].slice(0, limit).map((raw) =>
          field === "products"
            ? product(raw, data.dataSource)
            : {
                name: label(raw.name),
                image: productImage(raw.image),
                // No arbitrary external URL or proxy-account affiliate URL is forwarded.
                shopId: raw.shopId ? String(raw.shopId) : null,
                ratePercent:
                  number(raw.commissionRate) === null
                    ? null
                    : number(raw.commissionRate) * 100,
                startTime: number(raw.startTime),
                endTime: number(raw.endTime),
              },
        ),
      };
    },
    async history(values, { type = "price", days = 90 } = {}) {
      const valuesIds = ids(values, 50);
      ensure(
        ["price", "commission", "both"].includes(type),
        "Loại lịch sử không hợp lệ.",
      );
      integer(days, "Số ngày", 1, 730);
      ensure(
        type === "price" || tier.base_rate !== undefined,
        "Cần cấu hình tier hoa hồng trước khi đọc lịch sử hoa hồng.",
      );
      const data = await request(
        "history",
        {
          item_ids: valuesIds,
          type,
          days,
          changes_only: 1,
          no_product: 1,
          ...tier,
        },
        3600000,
        Math.max(1, Math.ceil(valuesIds.length / 5)),
      );
      ensure(
        Array.isArray(data.items) && data.items.length === valuesIds.length,
        "Lịch sử trả về không hợp lệ.",
        502,
      );
      return {
        ...meta(data),
        range: {
          from: label(data.range?.from),
          to: label(data.range?.to),
          days: number(data.range?.days),
        },
        truncated: !!data.limits?.truncated,
        items: data.items.slice(0, 50).map((row, index) => ({
          itemId: valuesIds[index],
          status: row.status,
          price: row.price
            ? {
                stats: safeStats(row.price.stats),
                points: (row.price.points || [])
                  .slice(0, 730)
                  .map((p) => ({ date: p.date, price: number(p.price) })),
              }
            : null,
          commission: row.commission
            ? {
                stats: safeStats(row.commission.stats),
                points: (row.commission.points || [])
                  .slice(0, 730)
                  .map((p) => ({
                    date: p.date,
                    ratePercent: number(p.totalRatePercent),
                    commission: number(p.commission),
                    suspect: !!p.suspect,
                  })),
              }
            : null,
        })),
      };
    },
  };
}
