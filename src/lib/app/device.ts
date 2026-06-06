/**
 * Privacy-safe device/browser detection derived purely from the User-Agent.
 * We deliberately capture only coarse buckets (no fingerprinting, no device ids)
 * to support partner analytics while honouring the privacy-first principle.
 */

import type { DeviceType } from "@/types/db";

export interface DeviceInfo {
  device_type: DeviceType;
  browser: string;
  operating_system: string;
}

export function detectDevice(ua: string = navigatorUA()): DeviceInfo {
  const u = ua.toLowerCase();

  let device_type: DeviceType = "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/.test(u)) device_type = "tablet";
  else if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(u))
    device_type = "mobile";
  if (!ua) device_type = "unknown";

  let browser = "Unknown";
  if (/edg\//.test(u)) browser = "Edge";
  else if (/opr\/|opera/.test(u)) browser = "Opera";
  else if (/chrome|crios/.test(u)) browser = "Chrome";
  else if (/firefox|fxios/.test(u)) browser = "Firefox";
  else if (/safari/.test(u)) browser = "Safari";

  let operating_system = "Unknown";
  if (/windows/.test(u)) operating_system = "Windows";
  else if (/iphone|ipad|ipod|ios/.test(u)) operating_system = "iOS";
  else if (/mac os x|macintosh/.test(u)) operating_system = "macOS";
  else if (/android/.test(u)) operating_system = "Android";
  else if (/linux/.test(u)) operating_system = "Linux";

  return { device_type, browser, operating_system };
}

function navigatorUA(): string {
  if (typeof navigator !== "undefined") return navigator.userAgent;
  return "";
}

export function getReferrer(): string | null {
  if (typeof document === "undefined") return null;
  return document.referrer || null;
}
