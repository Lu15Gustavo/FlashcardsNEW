import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const args = ["./node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", port];

const child = spawn(process.execPath, args, {
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
