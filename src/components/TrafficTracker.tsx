import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getSupabase } from "@/integrations/supabase/lazy-client";

const VISITOR_KEY = "neocharge_visitor_id";

function getOrCreateVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const v = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, v);
    return v;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function TrafficTracker() {
  const { pathname, search } = useLocation();
  const visitorId = useMemo(() => getOrCreateVisitorId(), []);
  const lastKeyRef = useRef<string>("");
  const lastAtRef = useRef<number>(0);

  useEffect(() => {
    const key = `${pathname}${search}`;
    const now = Date.now();

    // Avoid spamming duplicate events (e.g. re-renders)
    if (lastKeyRef.current === key && now - lastAtRef.current < 8000) return;
    lastKeyRef.current = key;
    lastAtRef.current = now;

    // Las fichas de producto cuentan una vista por sesión: las recargas
    // no deben inflar el "más visto" del panel Analytics.
    if (pathname.startsWith("/producto/")) {
      try {
        const seenKey = `nc_pv_${pathname}`;
        if (sessionStorage.getItem(seenKey)) return;
        sessionStorage.setItem(seenKey, "1");
      } catch {
        // sessionStorage no disponible: se registra igual
      }
    }

    const referrer = typeof document !== "undefined" ? document.referrer || null : null;
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent || null : null;

    // El tracking nunca bloquea el primer paint: el cliente Supabase viaja en
    // un chunk asíncrono y el insert se dispara cuando esté listo.
    getSupabase()
      .then((supabase) =>
        supabase
          .from("page_views")
          .insert({
            visitor_id: visitorId,
            path: pathname,
            search: search || null,
            referrer,
            user_agent: userAgent,
          })
          .then(({ error }) => {
            // Silent fail (tracking must never break UX)
            if (error) console.debug("page_views insert failed:", error.message);
          }),
      )
      .catch(() => {
        // Sin cliente no hay tracking; no rompe nada.
      });
  }, [pathname, search, visitorId]);

  return null;
}

