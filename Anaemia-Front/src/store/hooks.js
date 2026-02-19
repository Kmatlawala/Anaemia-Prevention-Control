import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';

export const useAuth = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const user = useSelector(state => state.auth.user);
  const role = useSelector(state => state.auth.role);
  const token = useSelector(state => state.auth.token);
  const error = useSelector(state => state.auth.error);
  const isLoading = useSelector(state => state.auth.isLoading);

  return {
    isAuthenticated,
    user,
    role,
    token,
    error,
    isLoading,
  };
};

export const useAuthActions = () => {
  const dispatch = useDispatch();
  
  return {
    loginSuccess: useCallback((payload) => dispatch({ type: 'auth/loginSuccess', payload }), [dispatch]),
    loginFailure: useCallback((payload) => dispatch({ type: 'auth/loginFailure', payload }), [dispatch]),
    logout: useCallback(() => dispatch({ type: 'auth/logout' }), [dispatch]),
    clearError: useCallback(() => dispatch({ type: 'auth/clearError' }), [dispatch]),
  };
};

export const useApp = () => {
  const dispatch = useDispatch();
  const isOnline = useSelector(state => state.app.isOnline);
  const isInitialized = useSelector(state => state.app.isInitialized);
  const theme = useSelector(state => state.app.theme);
  const language = useSelector(state => state.app.language);
  const notifications = useSelector(state => state.app.notifications);
  const sync = useSelector(state => state.app.sync);
  const loading = useSelector(state => state.app.loading);
  const error = useSelector(state => state.app.error);

  return {
    isOnline,
    isInitialized,
    theme,
    language,
    notifications,
    sync,
    loading,
    error,
  };
};

export const useAppActions = () => {
  const dispatch = useDispatch();
  
  return {
    setOnlineStatus: useCallback((status) => dispatch({ type: 'app/setOnlineStatus', payload: status }), [dispatch]),
    setTheme: useCallback((theme) => dispatch({ type: 'app/setTheme', payload: theme }), [dispatch]),
    setLanguage: useCallback((language) => dispatch({ type: 'app/setLanguage', payload: language }), [dispatch]),
    updateNotifications: useCallback((settings) => dispatch({ type: 'app/updateNotifications', payload: settings }), [dispatch]),
    clearError: useCallback(() => dispatch({ type: 'app/clearError' }), [dispatch]),
  };
};

export const useReports = () => {
  const dispatch = useDispatch();
  const reports = useSelector(state => state.report.reports);
  const filters = useSelector(state => state.report.filters);
  const currentReport = useSelector(state => state.report.currentReport);
  const loading = useSelector(state => state.report.loading);
  const error = useSelector(state => state.report.error);
  const lastUpdated = useSelector(state => state.report.lastUpdated);

  return {
    reports,
    filters,
    currentReport,
    loading,
    error,
    lastUpdated,
  };
};

export const useReportActions = () => {
  const dispatch = useDispatch();
  
  return {
    setFilters: useCallback((filters) => dispatch({ type: 'report/setFilters', payload: filters }), [dispatch]),
    resetFilters: useCallback(() => dispatch({ type: 'report/resetFilters' }), [dispatch]),
    setCurrentReport: useCallback((report) => dispatch({ type: 'report/setCurrentReport', payload: report }), [dispatch]),
    clearCurrentReport: useCallback(() => dispatch({ type: 'report/clearCurrentReport' }), [dispatch]),
    clearError: useCallback(() => dispatch({ type: 'report/clearError' }), [dispatch]),
  };
};

export const useBeneficiaries = () => {
  const dispatch = useDispatch();
  const beneficiaries = useSelector(state => state.beneficiary.beneficiaries);
  const currentBeneficiary = useSelector(state => state.beneficiary.currentBeneficiary);
  const interventions = useSelector(state => state.beneficiary.interventions);
  const filters = useSelector(state => state.beneficiary.filters);
  const loading = useSelector(state => state.beneficiary.loading);
  const error = useSelector(state => state.beneficiary.error);
  const lastUpdated = useSelector(state => state.beneficiary.lastUpdated);

  return {
    beneficiaries,
    currentBeneficiary,
    interventions,
    filters,
    loading,
    error,
    lastUpdated,
  };
};

export const useBeneficiaryActions = () => {
  const dispatch = useDispatch();
  
  return {
    setCurrentBeneficiary: useCallback((beneficiary) => dispatch({ type: 'beneficiary/setCurrentBeneficiary', payload: beneficiary }), [dispatch]),
    clearCurrentBeneficiary: useCallback(() => dispatch({ type: 'beneficiary/clearCurrentBeneficiary' }), [dispatch]),
    setFilters: useCallback((filters) => dispatch({ type: 'beneficiary/setFilters', payload: filters }), [dispatch]),
    resetFilters: useCallback(() => dispatch({ type: 'beneficiary/resetFilters' }), [dispatch]),
    clearError: useCallback(() => dispatch({ type: 'beneficiary/clearError' }), [dispatch]),
  };
};

export const useDashboard = () => {
  const auth = useAuth();
  const app = useApp();
  const reports = useReports();
  const beneficiaries = useBeneficiaries();
  
  return {
    auth,
    app,
    reports,
    beneficiaries,
  };
};

export const useLoading = () => {
  const authLoading = useSelector(state => state.auth.isLoading);
  const appLoading = useSelector(state => state.app.loading);
  const reportLoading = useSelector(state => state.report.loading);
  const beneficiaryLoading = useSelector(state => state.beneficiary.loading);
  
  return {
    isLoading: authLoading || appLoading || reportLoading || beneficiaryLoading,
    authLoading,
    appLoading,
    reportLoading,
    beneficiaryLoading,
  };
};

export const useErrors = () => {
  const authError = useSelector(state => state.auth.error);
  const appError = useSelector(state => state.app.error);
  const reportError = useSelector(state => state.report.error);
  const beneficiaryError = useSelector(state => state.beneficiary.error);
  
  return {
    hasError: !!(authError || appError || reportError || beneficiaryError),
    authError,
    appError,
    reportError,
    beneficiaryError,
  };
};
