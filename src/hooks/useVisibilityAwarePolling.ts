import { useEffect, useRef, useCallback } from 'react';

interface UseVisibilityAwarePollingOptions {
  /** Polling interval when page is visible (ms) */
  visibleInterval: number;
  /** Polling interval when page is hidden (ms), set to 0 to stop polling */
  hiddenInterval?: number;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Callback to execute on each poll */
  onPoll: () => void | Promise<void>;
  /** Optional callback when visibility changes */
  onVisibilityChange?: (isVisible: boolean) => void;
}

/**
 * A hook that polls at different intervals based on page visibility.
 * Jobs continue running in the background, but UI updates are paused when hidden.
 */
export function useVisibilityAwarePolling({
  visibleInterval,
  hiddenInterval = 0, // Default: stop polling when hidden
  enabled = true,
  onPoll,
  onVisibilityChange,
}: UseVisibilityAwarePollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(document.visibilityState === 'visible');

  const clearPollingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback((interval: number) => {
    clearPollingInterval();
    if (interval > 0 && enabled) {
      // Execute immediately
      onPoll();
      // Then set up interval
      intervalRef.current = setInterval(onPoll, interval);
    }
  }, [clearPollingInterval, enabled, onPoll]);

  const handleVisibilityChange = useCallback(() => {
    const isVisible = document.visibilityState === 'visible';
    isVisibleRef.current = isVisible;
    
    onVisibilityChange?.(isVisible);
    
    if (isVisible) {
      // Page became visible - start/resume polling at normal rate
      startPolling(visibleInterval);
    } else {
      // Page became hidden - either slow down or stop polling
      if (hiddenInterval > 0) {
        startPolling(hiddenInterval);
      } else {
        clearPollingInterval();
      }
    }
  }, [visibleInterval, hiddenInterval, startPolling, clearPollingInterval, onVisibilityChange]);

  useEffect(() => {
    if (!enabled) {
      clearPollingInterval();
      return;
    }

    // Start polling based on current visibility
    const interval = isVisibleRef.current ? visibleInterval : hiddenInterval;
    if (interval > 0) {
      startPolling(interval);
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearPollingInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, visibleInterval, hiddenInterval, startPolling, clearPollingInterval, handleVisibilityChange]);

  return {
    isVisible: isVisibleRef.current,
    forceRefresh: onPoll,
  };
}
