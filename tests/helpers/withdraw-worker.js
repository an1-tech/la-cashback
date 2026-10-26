import { parentPort, workerData } from "node:worker_threads";
import { openDb } from "../../server/db.js";
import { requestWithdrawal } from "../../server/finance.js";
const db = openDb(workerData.path);
parentPort.postMessage({ ready: true });
parentPort.once("message", () => {
  try {
    const w = requestWithdrawal(db, workerData.userId, 70000, workerData.key);
    parentPort.postMessage({ ok: true, id: w.id });
  } catch (e) {
    parentPort.postMessage({ ok: false, error: e.message });
  } finally {
    db.close();
  }
});
