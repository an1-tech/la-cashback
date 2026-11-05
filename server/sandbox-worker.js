import { parentPort } from "node:worker_threads";
import { openDb } from "./db.js";
import { createBatchedSandbox } from "./sandbox-copy.js";

let db, result;
try {
  db = openDb();
  result = { uid: createBatchedSandbox(db) };
} catch (error) {
  result = {
    error: error.status
      ? error.message
      : "Không thể tạo dữ liệu dùng thử. Kiểm tra kết nối Turso rồi thử lại.",
    status: error.status || 503,
  };
} finally {
  db?.close();
}
parentPort.postMessage(result);
