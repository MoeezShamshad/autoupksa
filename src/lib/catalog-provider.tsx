import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { applyManagedCatalogProducts, type ManagedCatalogProduct } from "./catalog";
import { setManagedProductTranslations } from "./i18n";

type ManagedTranslation = {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
};

const CatalogVersionContext = createContext(0);

export function useCatalogVersion() {
  return useContext(CatalogVersionContext);
}

export function CatalogProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    async function loadCatalog() {
      try {
        const response = await fetch("/api/catalog", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error(`Catalog request failed with status ${response.status}.`);
        }
        const payload = (await response.json()) as {
          products?: Array<ManagedCatalogProduct & ManagedTranslation>;
        };
        if (!Array.isArray(payload.products)) {
          throw new Error("Catalog response did not contain a product list.");
        }
        applyManagedCatalogProducts(payload.products);
        setManagedProductTranslations(payload.products);
        if (active) setVersion((current) => current + 1);
      } catch (error) {
        console.error("Unable to load the latest product catalog.", error);
      }
    }

    void loadCatalog();
    return () => {
      active = false;
    };
  }, [enabled]);

  return (
    <CatalogVersionContext.Provider value={version}>{children}</CatalogVersionContext.Provider>
  );
}
