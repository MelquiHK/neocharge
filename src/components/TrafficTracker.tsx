import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

    const referrer = typeof document !== "undefined" ? document.referrer || null : null;
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent || null : null;

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
      });
  }, [pathname, search, visitorId]);

  return null;
}

