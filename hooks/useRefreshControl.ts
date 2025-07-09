import { useState, useCallback } from 'react';
import { RefreshControlState } from '@/types/agent';

interface UseRefreshControlOptions {
  onRefresh: () => Promise<void>;
  cooldownMs?: number;
}

export function useRefreshControl({ 
  onRefresh, 
  cooldownMs = 1000 
}: UseRefreshControlOptions) {
  const [state, setState] = useState<RefreshControlState>({
    isRefreshing: false,
    lastRefresh: null,
  });

  const handleRefresh = useCallback(async () => {
    // Prevent rapid successive refreshes
    if (state.isRefreshing) return;
    
    const now = new Date();
    if (state.lastRefresh && now.getTime() - state.lastRefresh.getTime() < cooldownMs) {
      return;
    }

    setState(prev => ({ ...prev, isRefreshing: true }));
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setState({
        isRefreshing: false,
        lastRefresh: new Date(),
      });
    }
  }, [onRefresh, state.isRefreshing, state.lastRefresh, cooldownMs]);

  return {
    isRefreshing: state.isRefreshing,
    onRefresh: handleRefresh,
    lastRefresh: state.lastRefresh,
  };
} 