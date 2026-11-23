export type AnalyticsEventType = "add_to_cart" | "whatsapp_inquiry";

const SESSION_KEY = "autoup-analytics-session";
let fallbackSessionId: string | undefined;

function getSessionId() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
    return sessionId;
  } catch (error) {
    console.warn("Unable to persist the analytics session in this browser.", error);
    fallbackSessionId ??= crypto.randomUUID();
    return fallbackSessionId;
  }
}

export function trackAnalyticsEvent(type: AnalyticsEventType, productIds: string[] = []) {
  const event = {
    eventId: crypto.randomUUID(),
    sessionId: getSessionId(),
    type,
    productIds: [...new Set(productIds)],
  };

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify(event),
  })
    .then(async (response) => {
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        console.error(
          "Unable to record AutoUp analytics event.",
          payload?.error ?? response.status,
        );
      }
    })
    .catch((error: unknown) => {
      console.error("Unable to record AutoUp analytics event.", error);
    });
}
