import { execFileSync } from "node:child_process";

const port = 3000;

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function findWindowsListeners() {
  const output = run("netstat", ["-ano", "-p", "tcp"]);
  const listeners = new Set();

  for (const line of output.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;

    const columns = line.trim().split(/\s+/);
    const localAddress = columns[1] ?? "";
    const pid = columns[columns.length - 1];

    if (localAddress.endsWith(`:${port}`) && /^\d+$/.test(pid)) {
      listeners.add(pid);
    }
  }

  return [...listeners];
}

function findUnixListeners() {
  try {
    const output = run("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"]);
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const isWindows = process.platform === "win32";
const listeners = isWindows ? findWindowsListeners() : findUnixListeners();

if (listeners.length === 0) {
  console.log(`Port ${port} is clear.`);
  process.exit(0);
}

for (const pid of listeners) {
  console.log(`Terminating process ${pid} on port ${port}.`);
  if (isWindows) {
    execFileSync("taskkill", ["/PID", pid, "/F"], { stdio: "inherit" });
  } else {
    execFileSync("kill", ["-9", pid], { stdio: "inherit" });
  }
}

console.log(`Port ${port} is ready for this project.`);
