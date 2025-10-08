import { createSelector } from '@reduxjs/toolkit';

// Auth selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectUserRole = (state) => state.auth.role;
export const selectToken = (state) => state.auth.token;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthLoading = (state) => state.auth.isLoading;

// App selectors
export const selectApp = (state) => state.app;
export const selectIsOnline = (state) => state.app.isOnline;
export const selectIsInitialized = (state) => state.app.isInitialized;
export const selectTheme = (state) => state.app.theme;
export const selectLanguage = (state) => state.app.language;
export const selectNotifications = (state) => state.app.notifications;
export const selectSyncStatus = (state) => state.app.sync;
export const selectAppLoading = (state) => state.app.loading;
export const selectAppError = (state) => state.app.error;

// Report selectors
export const selectReport = (state) => state.report;
export const selectReportFilters = (state) => state.report.filters;
export const selectReports = (state) => state.report.reports;
export const selectCurrentReport = (state) => state.report.currentReport;
export const selectReportLoading = (state) => state.report.loading;
export const selectReportError = (state) => state.report.error;
export const selectLastReportUpdate = (state) => state.report.lastUpdated;

// Beneficiary selectors
export const selectBeneficiary = (state) => state.beneficiary;
export const selectBeneficiaries = (state) => state.beneficiary.beneficiaries;
export const selectCurrentBeneficiary = (state) => state.beneficiary.currentBeneficiary;
export const selectInterventions = (state) => state.beneficiary.interventions;
export const selectBeneficiaryFilters = (state) => state.beneficiary.filters;
export const selectBeneficiaryLoading = (state) => state.beneficiary.loading;
export const selectBeneficiaryError = (state) => state.beneficiary.error;
export const selectLastBeneficiaryUpdate = (state) => state.beneficiary.lastUpdated;

// Memoized selectors for filtered data
export const selectFilteredReports = createSelector(
  [selectReports, selectReportFilters],
  (reports, filters) => {
    return reports.filter(report => {
      // Filter by beneficiary type
      if (filters.beneficiaryType !== 'all' && report.category !== filters.beneficiaryType) {
        return false;
      }
      
      // Filter by intervention status
      if (filters.interventionStatus !== 'all' && report.status !== filters.interventionStatus) {
        return false;
      }
      
      // Filter by location
      if (filters.location !== 'all' && report.location !== filters.location) {
        return false;
      }
      
      // Filter by date range
      if (filters.dateRange.startDate && report.date < filters.dateRange.startDate) {
        return false;
      }
      
      if (filters.dateRange.endDate && report.date > filters.dateRange.endDate) {
        return false;
      }
      
      return true;
    });
  }
);

export const selectFilteredBeneficiaries = createSelector(
  [selectBeneficiaries, selectBeneficiaryFilters],
  (beneficiaries, filters) => {
    return beneficiaries.filter(beneficiary => {
      // Filter by search query
      if (filters.searchQuery && !beneficiary.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filter by status
      if (filters.status !== 'all' && beneficiary.status !== filters.status) {
        return false;
      }
      
      // Filter by category
      if (filters.category !== 'all' && beneficiary.category !== filters.category) {
        return false;
      }
      
      // Filter by location
      if (filters.location !== 'all' && beneficiary.location !== filters.location) {
        return false;
      }
      
      return true;
    });
  }
);

// Statistics selectors
export const selectReportStats = createSelector(
  [selectFilteredReports],
  (reports) => {
    const stats = {
      total: reports.length,
      byCategory: {},
      byStatus: {},
      byLocation: {},
    };
    
    reports.forEach(report => {
      // Count by category
      stats.byCategory[report.category] = (stats.byCategory[report.category] || 0) + 1;
      
      // Count by status
      stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;
      
      // Count by location
      stats.byLocation[report.location] = (stats.byLocation[report.location] || 0) + 1;
    });
    
    return stats;
  }
);

export const selectBeneficiaryStats = createSelector(
  [selectFilteredBeneficiaries],
  (beneficiaries) => {
    const stats = {
      total: beneficiaries.length,
      byCategory: {},
      byStatus: {},
      byLocation: {},
      byAgeGroup: {},
    };
    
    beneficiaries.forEach(beneficiary => {
      // Count by category
      stats.byCategory[beneficiary.category] = (stats.byCategory[beneficiary.category] || 0) + 1;
      
      // Count by status
      stats.byStatus[beneficiary.status] = (stats.byStatus[beneficiary.status] || 0) + 1;
      
      // Count by location
      stats.byLocation[beneficiary.location] = (stats.byLocation[beneficiary.location] || 0) + 1;
      
      // Count by age group
      const ageGroup = beneficiary.age < 5 ? 'Under5' : 
                      beneficiary.age < 18 ? 'Adolescent' : 
                      beneficiary.age < 50 ? 'WoRA' : 'Elderly';
      stats.byAgeGroup[ageGroup] = (stats.byAgeGroup[ageGroup] || 0) + 1;
    });
    
    return stats;
  }
);

// Combined selectors for dashboard
export const selectDashboardData = createSelector(
  [selectReportStats, selectBeneficiaryStats, selectSyncStatus, selectIsOnline],
  (reportStats, beneficiaryStats, syncStatus, isOnline) => ({
    reports: reportStats,
    beneficiaries: beneficiaryStats,
    sync: syncStatus,
    isOnline,
  })
);

// Loading states
export const selectIsAnyLoading = createSelector(
  [selectAuthLoading, selectAppLoading, selectReportLoading, selectBeneficiaryLoading],
  (authLoading, appLoading, reportLoading, beneficiaryLoading) => 
    authLoading || appLoading || reportLoading || beneficiaryLoading
);

// Error states
export const selectAnyError = createSelector(
  [selectAuthError, selectAppError, selectReportError, selectBeneficiaryError],
  (authError, appError, reportError, beneficiaryError) => 
    authError || appError || reportError || beneficiaryError
);

// User permissions based on role
export const selectUserPermissions = createSelector(
  [selectUserRole],
  (role) => {
    const permissions = {
      canViewReports: true,
      canCreateReports: true,
      canEditReports: false,
      canDeleteReports: false,
      canViewBeneficiaries: true,
      canCreateBeneficiaries: true,
      canEditBeneficiaries: false,
      canDeleteBeneficiaries: false,
      canViewAdmin: false,
      canManageUsers: false,
    };
    
    if (role === 'admin') {
      return {
        ...permissions,
        canEditReports: true,
        canDeleteReports: true,
        canEditBeneficiaries: true,
        canDeleteBeneficiaries: true,
        canViewAdmin: true,
        canManageUsers: true,
      };
    }
    
    if (role === 'supervisor') {
      return {
        ...permissions,
        canEditReports: true,
        canEditBeneficiaries: true,
        canViewAdmin: true,
      };
    }
    
    return permissions;
  }
);
