"use client";

/**
 * Analytics tracking hook — fires engagement events to /analytics/event
 * Tracks exercise starts, completions, page views, session duration
 */
import { useCallback, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/api";

export function useAnalytics() {
  const sessionStart = useRef(Date.now());

  const trackEvent = useCallback(async (eventType: string, eventData: Record<string, any> = {}, page?: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      await fetch(`${API_BASE_URL}/analytics/event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_type: eventType,
          event_data: eventData,
          page: page || (typeof window !== "undefined" ? window.location.pathname : undefined),
        }),
      });
    } catch {
      // Silent fail — analytics should never break the app
    }
  }, []);

  // Track page view on mount
  useEffect(() => {
    trackEvent("page_viewed");
    
    // Track session duration on unmount
    return () => {
      const duration = Math.round((Date.now() - sessionStart.current) / 1000);
      if (duration > 3) { // only track if spent more than 3 seconds
        trackEvent("session_duration", { seconds: duration });
      }
    };
  }, [trackEvent]);

  return { trackEvent };
}
