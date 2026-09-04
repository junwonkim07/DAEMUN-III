import fs from "node:fs/promises";
import os from "node:os";

export type SystemStats = {
  cpu: { usagePct: number; load1: number; cores: number };
  memory: { totalBytes: number; usedBytes: number };
  swap: { totalBytes: number; usedBytes: number };
  disk: { totalBytes: number; usedBytes: number };
  uptimeSec: number;
};

/** Linux /proc/meminfo in bytes; empty object elsewhere (dev on Windows/macOS). */
async function meminfo(): Promise<Record<string, number>> {
  try {
    const text = await fs.readFile("/proc/meminfo", "utf8");
    const out: Record<string, number> = {};
    for (const line of text.split("\n")) {
      const m = /^(\w+):\s+(\d+)\s*kB/.exec(line);
      if (m) out[m[1]!] = Number(m[2]) * 1024;
    }
    return out;
  } catch {
    return {};
  }
}

function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const c of os.cpus()) {
    idle += c.times.idle;
    total += c.times.user + c.times.nice + c.times.sys + c.times.irq + c.times.idle;
  }
  return { idle, total };
}

/** CPU usage over a short sample window. */
async function cpuUsagePct(sampleMs = 400) {
  const a = cpuTimes();
  await new Promise((r) => setTimeout(r, sampleMs));
  const b = cpuTimes();
  const total = b.total - a.total;
  if (total <= 0) return 0;
  return Math.round(((total - (b.idle - a.idle)) / total) * 1000) / 10;
}

/**
 * Host resource snapshot. Inside Docker, /proc/meminfo and statfs("/") report
 * the host's memory and the root filesystem the overlay lives on, which is
 * what the operator wants to see for a single-VPS deployment.
 */
export async function systemStats(): Promise<SystemStats> {
  const [usagePct, mi, st] = await Promise.all([
    cpuUsagePct(),
    meminfo(),
    fs.statfs("/").catch(() => null),
  ]);

  const memTotal = mi.MemTotal ?? os.totalmem();
  const memAvail = mi.MemAvailable ?? os.freemem();
  const swapTotal = mi.SwapTotal ?? 0;
  const swapFree = mi.SwapFree ?? 0;
  const diskTotal = st ? st.bsize * st.blocks : 0;
  const diskFree = st ? st.bsize * st.bavail : 0;

  return {
    cpu: { usagePct, load1: os.loadavg()[0] ?? 0, cores: os.cpus().length },
    memory: { totalBytes: memTotal, usedBytes: memTotal - memAvail },
    swap: { totalBytes: swapTotal, usedBytes: swapTotal - swapFree },
    disk: { totalBytes: diskTotal, usedBytes: diskTotal - diskFree },
    uptimeSec: Math.round(os.uptime()),
  };
}
