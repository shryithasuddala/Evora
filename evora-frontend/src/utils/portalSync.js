import { useEffect, useRef } from "react";

const CHANNEL_NAME = "evora_portal_sync";
const STORAGE_KEY = "evora_portal_sync_event";
const LOCAL_EVENT_NAME = "evora_local_sync";

// Global BroadcastChannel instance
let globalChannel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    globalChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  globalChannel = null;
}

/**
 * Broadcast an update event across ALL portals (tabs, windows, same-page components)
 * @param {string} actionType e.g. "EVENT_COMPLETED", "BOOKING_COMPLETED", "TASK_COMPLETED", "SYNC"
 * @param {object} payload optional metadata like eventId, bookingId
 */
export const broadcastPortalSync = (actionType = "EVENT_COMPLETED", payload = {}) => {
  const syncPayload = {
    actionType,
    payload,
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel (cross-tab in modern browsers)
  if (globalChannel) {
    try {
      globalChannel.postMessage(syncPayload);
    } catch {
      // Channel might have closed
    }
  }

  // 2. LocalStorage event (cross-tab fallback for all browsers)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(syncPayload));
  } catch {
    // Ignore storage quota errors
  }

  // 3. Same-tab DOM CustomEvent
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LOCAL_EVENT_NAME, { detail: syncPayload }));
    }
  } catch {
    // Ignore
  }
};

/**
 * Hook to automatically keep any portal view in sync when "Mark as Completed"
 * or any status change occurs in any portal or tab.
 *
 * @param {Function} onSync Callback function to re-fetch data
 * @param {number} pollIntervalMs Background polling interval (defaults to 4000ms, set 0 to disable)
 */
export const usePortalSync = (onSync, pollIntervalMs = 4000) => {
  const callbackRef = useRef(onSync);
  callbackRef.current = onSync;

  useEffect(() => {
    const handleTrigger = (detail) => {
      if (typeof callbackRef.current === "function") {
        try {
          callbackRef.current(detail);
        } catch (err) {
          console.warn("[PortalSync Trigger Warning]:", err);
        }
      }
    };

    // 1. Listen to BroadcastChannel
    let tabChannel = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        tabChannel = new BroadcastChannel(CHANNEL_NAME);
        tabChannel.onmessage = (event) => {
          handleTrigger(event.data);
        };
      }
    } catch {
      tabChannel = null;
    }

    // 2. Listen to StorageEvent (cross-tab fallback)
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          handleTrigger(parsed);
        } catch {
          // ignore parse errors
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Listen to same-window Local Event
    const handleLocal = (event) => {
      handleTrigger(event.detail);
    };
    window.addEventListener(LOCAL_EVENT_NAME, handleLocal);

    // 4. Tab visibility change & Window focus (re-fetch as soon as user returns to portal)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleTrigger({ actionType: "TAB_VISIBLE" });
      }
    };
    const handleFocus = () => {
      handleTrigger({ actionType: "WINDOW_FOCUS" });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    // 5. Lightweight background polling (only runs when tab is active/visible)
    let intervalId = null;
    if (pollIntervalMs && pollIntervalMs > 0) {
      intervalId = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          handleTrigger({ actionType: "POLL" });
        }
      }, pollIntervalMs);
    }

    return () => {
      if (tabChannel) {
        try {
          tabChannel.close();
        } catch {}
      }
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LOCAL_EVENT_NAME, handleLocal);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollIntervalMs]);
};
