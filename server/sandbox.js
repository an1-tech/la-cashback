import { Worker } from "node:worker_threads";
import { AppError } from "./security.js";

// libSQL's synchronous network calls must not block the HTTP health checks
// while creating the many sample transactions for a private account.
export function createRemoteSandbox() {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./sandbox-worker.js", import.meta.url));
    let finished = false;
    const finish = (error, uid) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(uid);
    };
    const timer = setTimeout(() => {
      worker.terminate();
      finish(
        new AppError(
          "Tạo tài khoản dùng thử quá lâu. Vui lòng thử lại sau.",
          503,
        ),
      );
    }, 120000);
    timer.unref();
    worker.once("message", (result) => {
      if (result.uid) finish(null, result.uid);
      else finish(new AppError(result.error, result.status));
    });
    worker.once("error", () =>
      finish(
        new AppError(
          "Không thể chuẩn bị dữ liệu dùng thử. Vui lòng thử lại.",
          503,
        ),
      ),
    );
    worker.once("exit", () => {
      if (!finished)
        finish(
          new AppError(
            "Tạo dữ liệu dùng thử bị gián đoạn. Vui lòng thử lại.",
            503,
          ),
        );
    });
  });
}
