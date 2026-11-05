import { createAddLiveTag } from "../server/providers/addlivetag.js";

// Run with node --env-file-if-exists=.env scripts/check-catalog.mjs [item_id]
// No credentials, raw upstream body or complete URLs are ever printed.
const service = createAddLiveTag();
if (!service.capabilities.configured) {
  console.error("Chưa đặt ADDLIVETAG_API_KEY trong môi trường backend.");
  process.exitCode = 1;
} else {
  try {
    const data = await service.inspect(process.argv[2] || "1589295236");
    console.log(
      JSON.stringify({
        ok: true,
        source: data.source,
        dataSource: data.product.dataSource,
        hasTitle: !!data.product.title,
        hasPrice: data.product.price !== null,
        stale: data.stale,
        referenceOnly: data.referenceOnly,
      }),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
