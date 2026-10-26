import { spawn } from "node:child_process";
const backend = spawn(process.execPath, ["--watch", "server/index.js"], {
  stdio: "inherit",
  env: process.env,
});
const frontend = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
  { stdio: "inherit", env: process.env },
);
let closing = false;
function close() {
  if (closing) return;
  closing = true;
  backend.kill();
  frontend.kill();
}
backend.on("exit", close);
frontend.on("exit", close);
process.on("SIGINT", close);
process.on("SIGTERM", close);
