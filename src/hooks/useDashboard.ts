import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store';

export const useDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dashboardState = useSelector((state: RootState) => state.dashboard);

  return {
    // Dashboard state
    isInitialized: dashboardState.isInitialized,
    initializationTimestamp: dashboardState.initializationTimestamp,
    analytics: dashboardState.analytics,
    
    // Loading states
    loading: dashboardState.loading,
    
    // Error states
    error: dashboardState.error,
    
    // UI state
    ui: dashboardState.ui,
    
    // Dispatch for actions
    dispatch,
  };
};

export default useDashboard;
