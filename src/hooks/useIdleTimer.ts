'use client';

import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'next-auth/react';

interface UseIdleTimerOptions {
  timeout: number; // in milliseconds
  onIdle?: () => void;
  onWarning?: (remainingTime: number) => void;
  warningTime?: number; // time before timeout to show warning
  events?: string[];
  enabled?: boolean;
}

const DEFAULT_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
  'wheel'
];

export function useIdleTimer({
  timeout = 60000, // 1 minute default
  onIdle,
  onWarning,
  warningTime = 15000, // 15 seconds before timeout
  events = DEFAULT_EVENTS,
  enabled = true
}: UseIdleTimerOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    try {
      await signOut({
        callbackUrl: '/auth/signin',
        redirect: true
      });
    } catch (error) {
      console.error('Error during automatic logout:', error);
      // Force redirect if signOut fails
      window.location.href = '/auth/signin';
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    
    // Set warning timer
    if (onWarning && warningTime < timeout) {
      warningTimeoutRef.current = setTimeout(() => {
        const remainingTime = timeout - warningTime;
        onWarning(remainingTime);
      }, timeout - warningTime);
    }
    
    // Set logout timer
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

    // Start the timer
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      
      events.forEach(event => {
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
    resetTimer: handleActivity
  };
}

export default useIdleTimer;