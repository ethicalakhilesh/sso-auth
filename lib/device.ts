/**
 * Converts a browser User-Agent into a short, human-readable device/browser
 * label for the sign-in history.
 *
 * This is intentionally heuristic: browsers don't reliably expose hardware
 * model names in User-Agent strings.
 */
export function getDeviceName(userAgent: string): string {
  const ua = userAgent || "";

  let device = "Unknown device";

  if (/iPhone/i.test(ua)) {
    device = "iPhone";
  } else if (/iPad/i.test(ua)) {
    device = "iPad";
  } else if (/Android/i.test(ua)) {
    // Typical Android UA examples:
    // Android 15; SM-S928B Build/AP3A...
    // Android 14; Pixel 8 Build/UQ1A...
    const androidPart = ua
      .match(
        /Android\s+[^;)]+(?:;\s*)?([^;)]*?)(?:\s+Build\/[^;)]+)?[;)]/i
      )?.[1]
      ?.trim();

    const model =
      androidPart &&
      !/^wv$/i.test(androidPart) &&
      !/^Mobile$/i.test(androidPart) &&
      androidPart.length <= 40
        ? androidPart
        : "";

    device = model ? `Android · ${model}` : "Android";
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
  } else if (/CriOS\//i.test(ua)) {
    browser = "Chrome";
  } else if (/Chrome\//i.test(ua)) {
    browser = "Chrome";
  } else if (/FxiOS\//i.test(ua)) {
    browser = "Firefox";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) {
    browser = "Safari";
  }

  if (device === "iPhone" || device === "iPad") {
    return browser ? `${device} · ${browser}` : device;
  }

  if (device.startsWith("Android · ")) {
    return browser ? `${device} · ${browser}` : device;
  }

  return browser ? `${device} · ${browser}` : device;
}