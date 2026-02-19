import { createSelector } from '@reduxjs/toolkit';

export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectUserRole = (state) => state.auth.role;
export const selectToken = (state) => state.auth.token;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthLoading = (state) => state.auth.isLoading;

export const selectApp = (state) => state.app;
export const selectIsOnline = (state) => state.app.isOnline;
export const selectIsInitialized = (state) => state.app.isInitialized;
export const selectTheme = (state) => state.app.theme;
export const selectLanguage = (state) => state.app.language;
export const selectNotifications = (state) => state.app.notifications;
export const selectSyncStatus = (state) => state.app.sync;
export const selectAppLoading = (state) => state.app.loading;
export const selectAppError = (state) => state.app.error;

export const selectReport = (state) => state.report;
export const selectReportFilters = (state) => state.report.filters;
export const selectReports = (state) => state.report.reports;
export const selectCurrentReport = (state) => state.report.currentReport;
export const selectReportLoading = (state) => state.report.loading;
export const selectReportError = (state) => state.report.error;
export const selectLastReportUpdate = (state) => state.report.lastUpdated;

export const selectBeneficiary = (state) => state.beneficiary;
export const selectBeneficiaries = (state) => state.beneficiary.beneficiaries;
export const selectCurrentBeneficiary = (state) => state.beneficiary.currentBeneficiary;
export const selectInterventions = (state) => state.beneficiary.interventions;
export const selectBeneficiaryFilters = (state) => state.beneficiary.filters;
export const selectBeneficiaryLoading = (state) => state.beneficiary.loading;
export const selectBeneficiaryError = (state) => state.beneficiary.error;
export const selectLastBeneficiaryUpdate = (state) => state.beneficiary.lastUpdated;

export const selectFilteredReports = createSelector(
  [selectReports, selectReportFilters],
  (reports, filters) => {
    return reports.filter(report => {
      
      if (filters.beneficiaryType !== 'all' && report.category !== filters.beneficiaryType) {
        return false;
      }

      if (filters.interventionStatus !== 'all' && report.status !== filters.interventionStatus) {
        return false;
      }

      if (filters.location !== 'all' && report.location !== filters.location) {
        return false;
      }

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
      
      if (filters.searchQuery && !beneficiary.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }

      if (filters.status !== 'all' && beneficiary.status !== filters.status) {
        return false;
      }

      if (filters.category !== 'all' && beneficiary.category !== filters.category) {
        return false;
      }

      if (filters.location !== 'all' && beneficiary.location !== filters.location) {
        return false;
      }
      
      return true;
    });
  }
);

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
      
      stats.byCategory[report.category] = (stats.byCategory[report.category] || 0) + 1;

      stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;

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
      
      stats.byCategory[beneficiary.category] = (stats.byCategory[beneficiary.category] || 0) + 1;

      stats.byStatus[beneficiary.status] = (stats.byStatus[beneficiary.status] || 0) + 1;

      stats.byLocation[beneficiary.location] = (stats.byLocation[beneficiary.location] || 0) + 1;

      const ageGroup = beneficiary.age < 5 ? 'Under5' : 
                      beneficiary.age < 18 ? 'Adolescent' : 
                      beneficiary.age < 50 ? 'WoRA' : 'Elderly';
      stats.byAgeGroup[ageGroup] = (stats.byAgeGroup[ageGroup] || 0) + 1;
    });
    
    return stats;
  }
);

export const selectDashboardData = createSelector(
  [selectReportStats, selectBeneficiaryStats, selectSyncStatus, selectIsOnline],
  (reportStats, beneficiaryStats, syncStatus, isOnline) => ({
    reports: reportStats,
    beneficiaries: beneficiaryStats,
    sync: syncStatus,
    isOnline,
  })
);

export const selectIsAnyLoading = createSelector(
  [selectAuthLoading, selectAppLoading, selectReportLoading, selectBeneficiaryLoading],
  (authLoading, appLoading, reportLoading, beneficiaryLoading) => 
    authLoading || appLoading || reportLoading || beneficiaryLoading
);

export const selectAnyError = createSelector(
  [selectAuthError, selectAppError, selectReportError, selectBeneficiaryError],
  (authError, appError, reportError, beneficiaryError) => 
    authError || appError || reportError || beneficiaryError
);

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
