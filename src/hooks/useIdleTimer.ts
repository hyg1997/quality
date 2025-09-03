"use client";

import { useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";

interface UseIdleTimerOptions {
  timeout: number;
  onIdle?: () => void;
  onWarning?: (remainingTime: number) => void;
  warningTime?: number;
  events?: string[];
  enabled?: boolean;
}

const DEFAULT_EVENTS = [
  "mousedown",
  "mousemove",
  "keypress",
  "scroll",
  "touchstart",
  "click",
  "wheel",
];

export function useIdleTimer({
  timeout = 60000,
  onIdle,
  onWarning,
  warningTime = 15000,
  events = DEFAULT_EVENTS,
  enabled = true,
}: UseIdleTimerOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    try {
      await signOut({
        callbackUrl: "/auth/signin",
        redirect: true,
      });
    } catch (error) {
      console.error("Error during automatic logout:", error);

      window.location.href = "/auth/signin";
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    if (onWarning && warningTime < timeout) {
      warningTimeoutRef.current = setTimeout(() => {
        const remainingTime = timeout - warningTime;
        onWarning(remainingTime);
      }, timeout - warningTime);
    }

    timeoutRef.current = setTimeout(() => {
      if (onIdle) {
        onIdle();
      } else {
        handleLogout();
      }
    }, timeout);
  }, [timeout, warningTime, onIdle, onWarning, handleLogout, enabled]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    resetTimer();

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }

      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [enabled, events, handleActivity, resetTimer]);

  const getRemainingTime = useCallback(() => {
    if (!enabled || !timeoutRef.current) return 0;
    const elapsed = Date.now() - lastActivityRef.current;
    return Math.max(0, timeout - elapsed);
  }, [timeout, enabled]);

  const pause = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (enabled) {
      resetTimer();
    }
  }, [enabled, resetTimer]);

  return {
    getRemainingTime,
    pause,
    resume,
    resetTimer: handleActivity,
  };
}

export default useIdleTimer;
