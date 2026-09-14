/**
 * Converts a browser User-Agent into a short, human-readable device/browser
 * label for the sign-in history. This is intentionally heuristic: browsers
 * don't reliably expose hardware model names in User-Agent strings.
 */
export function getDeviceName(userAgent: string): string {
  const ua = userAgent || "";

  let device = "Unknown device";

  if (/iPhone/i.test(ua)) {
    device = "iPhone";
  } else if (/iPad/i.test(ua)) {
    device = "iPad";
  } else if (/Android/i.test(ua)) {
    const model = ua.match(/Android[^;)]*;\s*(?:[a-z]{2}-[A-Z]{2};\s*)?([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i)?.[1]?.trim();
    device = model && model.length <= 40 && !/^wv$/i.test(model)
      ? `Android · ${model}`
      : "Android";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    device = "Mac";
  } else if (/Windows/i.test(ua)) {
    device = "Windows";
  } else if (/Linux/i.test(ua)) {
    device = "Linux";
  }

  let browser = "";
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/OPR\//i.test(ua)) {
    browser = "Opera";
  } else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    browser = "Chrome";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) {
    browser = "Safari";
  } else if (/CriOS\//i.test(ua)) {
    browser = "Chrome";
  } else if (/FxiOS\//i.test(ua)) {
    browser = "Firefox";
  }

  if (device === "iPhone" || device === "iPad") {
    return browser ? `${device} · ${browser}` : device;
  }

  if (device.startsWith("Android · ")) {
    return browser ? `${device} · ${browser}` : device;
  }

  return browser ? `${device} · ${browser}` : device;
}
