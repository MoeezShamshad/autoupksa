import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import defaultContent from "@/data/website-content.json";

export type WebsiteContent = typeof defaultContent;

const ContentContext = createContext<WebsiteContent>(defaultContent);
let activeContent: WebsiteContent = defaultContent;
const listeners = new Set<(content: WebsiteContent) => void>();

export function getWebsiteContent() {
  return activeContent;
}

export function updateWebsiteContent(content: WebsiteContent) {
  activeContent = content;
  for (const listener of listeners) listener(content);
}

export function useWebsiteContent() {
  return useContext(ContentContext);
}

export function WebsiteContentProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const [content, setContent] = useState(activeContent);

  useEffect(() => {
    listeners.add(setContent);
    if (!enabled) return () => listeners.delete(setContent);
    let active = true;

    fetch("/api/site-content", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Content request failed with status ${response.status}.`);
        const payload = (await response.json()) as WebsiteContent;
        if (active) updateWebsiteContent(payload);
      })
      .catch((error: unknown) => {
        if (active) console.error("Unable to load the latest AutoUp website content.", error);
      });

    return () => {
      active = false;
      listeners.delete(setContent);
    };
  }, [enabled]);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}
