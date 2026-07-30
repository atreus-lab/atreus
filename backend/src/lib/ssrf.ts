import { resolve4, resolve6 } from "dns/promises";
import { isIPv4, isIPv6 } from "net";

const PRIVATE_RANGES: { start: number; end: number }[] = [
  { start: ipv4ToInt([10, 0, 0, 0]), end: ipv4ToInt([10, 255, 255, 255]) },
  { start: ipv4ToInt([172, 16, 0, 0]), end: ipv4ToInt([172, 31, 255, 255]) },
  { start: ipv4ToInt([192, 168, 0, 0]), end: ipv4ToInt([192, 168, 255, 255]) },
  { start: ipv4ToInt([127, 0, 0, 0]), end: ipv4ToInt([127, 255, 255, 255]) },
  { start: ipv4ToInt([169, 254, 0, 0]), end: ipv4ToInt([169, 254, 255, 255]) },
];

function ipv4ToInt(octets: number[]): number {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  if (!isIPv4(ip)) return false;
  const addr = ipv4ToInt(ip.split(".").map(Number));
  return PRIVATE_RANGES.some((r) => addr >= r.start && addr <= r.end);
}

function isPrivateIPv6(ip: string): boolean {
  if (!isIPv6(ip)) return false;
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
  // fc00::/7 unique local, fe80::/10 link-local
  const prefix = lower.startsWith("::") ? "" : lower.split(":").slice(0, 2).join(":");
  if (prefix.startsWith("fc") || prefix.startsWith("fd")) return true;
  if (prefix.startsWith("fe80") || prefix.startsWith("fe8") || prefix.startsWith("fe9") || prefix.startsWith("fea") || prefix.startsWith("feb")) return true;
  return false;
}

function isPrivateIP(ip: string): boolean {
  return isPrivateIPv4(ip) || isPrivateIPv6(ip);
}

export async function validateWebhookUrl(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return "webhookUrl must use the https:// scheme";
    }

    // The WHATWG URL spec stores IPv6 literals with surrounding brackets (e.g. "[::1]").
    // net.isIPv4/isIPv6 do not accept the bracketed form, so strip them first.
    const hostname = parsed.hostname;
    const rawHostname =
      hostname.startsWith("[") && hostname.endsWith("]")
        ? hostname.slice(1, -1)
        : hostname;

    if (isIPv4(rawHostname) || isIPv6(rawHostname)) {
      return isPrivateIP(rawHostname) ? "webhookUrl must not point to a private or internal address" : null;
    }

    const addresses: string[] = [];
    try {
      addresses.push(...(await resolve4(rawHostname)));
    } catch {}
    try {
      addresses.push(...(await resolve6(rawHostname)));
    } catch {}

    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        return "webhookUrl must not point to a private or internal address";
      }
    }

    return null;
  } catch {
    return "webhookUrl must be a valid https:// URL";
  }
}
