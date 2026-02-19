# Redux Toolkit Setup for Anaemia App

This directory contains the complete Redux Toolkit setup for the Anaemia React Native app, providing centralized state management with modern Redux patterns.

## 📁 Structure

```
src/store/
├── authSlice.js          # Authentication state management
├── reportSlice.js        # Reports state management
├── beneficiarySlice.js  # Beneficiaries state management
├── appSlice.js          # App-wide state management
├── store.js             # Store configuration
├── selectors.js         # Memoized selectors
├── hooks.js             # Custom hooks for components
└── README.md            # This file
```

## 🚀 Features

### ✅ Complete Redux Toolkit Implementation

- **Slices**: Modern Redux with `createSlice` for all features
- **Async Thunks**: Built-in async action handling
- **Selectors**: Memoized selectors for performance
- **Hooks**: Custom hooks for easy component integration
- **TypeScript Ready**: Full type safety support

### 🔐 Authentication Management

- User login/logout with persistence
- Role-based access control
- Token management
- Auto-initialization on app start

### 📊 Data Management

- **Beneficiaries**: CRUD operations with filtering
- **Reports**: Report generation and filtering
- **App State**: Theme, language, notifications, sync status

### 🎯 State Features

- **Persistence**: Auth state persisted to AsyncStorage
- **Offline Support**: Network status tracking
- **Error Handling**: Comprehensive error management
- **Loading States**: UI loading indicators
- **Filtering**: Advanced filtering capabilities

## 📖 Usage Examples

### 1. Using Hooks in Components

```javascript
import React from 'react';
import {useAuth, useBeneficiaries, useReports} from '../store/hooks';

function MyComponent() {
  const {isAuthenticated, user, loginUser} = useAuth();
  const {beneficiaries, fetchBeneficiaries} = useBeneficiaries();
  const {reports, generateReport} = useReports();

  // Component logic...
}
```

### 2. Direct Redux Usage

```javascript
import {useSelector, useDispatch} from 'react-redux';
import {
  fetchBeneficiaries,
  selectBeneficiaries,
} from '../store/beneficiarySlice';

function MyComponent() {
  const dispatch = useDispatch();
  const beneficiaries = useSelector(selectBeneficiaries);

  const handleFetch = () => {
    dispatch(fetchBeneficiaries());
  };
}
```

### 3. Async Actions

```javascript
// Login user
const handleLogin = async () => {
  try {
    await dispatch(loginUser({username, password})).unwrap();
    // Success handling
  } catch (error) {
    // Error handling
  }
};

// Fetch data with filters
const handleFetch = async () => {
  try {
    await dispatch(fetchBeneficiaries(filters)).unwrap();
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```

## 🔧 Available Actions

### Authentication

- `loginUser(credentials)` - Login with username/password
- `logout()` - Logout user
- `initializeAuth()` - Initialize auth state on app start

### Beneficiaries

- `fetchBeneficiaries(filters)` - Fetch beneficiaries with filters
- `addBeneficiary(data)` - Add new beneficiary
- `updateBeneficiary({id, updates})` - Update beneficiary
- `addIntervention(data)` - Add intervention to beneficiary

### Reports

- `fetchReports(filters)` - Fetch reports with filters
- `generateReport(data)` - Generate new report
- `setFilters(filters)` - Update report filters

### App

- `initializeApp()` - Initialize app state
- `syncData()` - Sync data with server
- `setTheme(theme)` - Change app theme
- `setLanguage(language)` - Change app language

## 🎯 Selectors

### Basic Selectors

```javascript
// Auth
selectIsAuthenticated, selectUser, selectRole, selectToken;

// Beneficiaries
selectBeneficiaries, selectCurrentBeneficiary, selectInterventions;

// Reports
selectReports, selectCurrentReport, selectReportFilters;

// App
selectIsOnline, selectTheme, selectLanguage, selectSyncStatus;
```

### Memoized Selectors

```javascript
// Filtered data
selectFilteredBeneficiaries, selectFilteredReports;

// Statistics
selectBeneficiaryStats, selectReportStats;

// Combined data
selectDashboardData, selectUserPermissions;
```

## 🔄 State Flow

1. **App Initialization**

   - Store configured with all slices
   - Auth state loaded from AsyncStorage
   - App state initialized

2. **User Actions**

   - Components dispatch actions
   - Slices handle state updates
   - Selectors provide filtered data
   - Components re-render with new state

3. **Data Persistence**
   - Auth state automatically persisted
   - Other state managed in memory
   - Sync with server when online

## 🎨 Best Practices

### 1. Use Custom Hooks

```javascript
// ✅ Good
const {beneficiaries, loading} = useBeneficiaries();

// ❌ Avoid
const beneficiaries = useSelector(state => state.beneficiary.beneficiaries);
```

### 2. Handle Loading States

```javascript
const {loading, error} = useBeneficiaries();

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

### 3. Use Memoized Selectors

```javascript
// ✅ Good - Memoized
const filteredData = useSelector(selectFilteredBeneficiaries);

// ❌ Avoid - Recalculated on every render
const filteredData = beneficiaries.filter(b => b.category === 'Pregnant');
```

### 4. Error Handling

```javascript
const handleAction = async () => {
  try {
    await dispatch(someAsyncAction()).unwrap();
    // Success
  } catch (error) {
    // Handle error
    Alert.alert('Error', error);
  }
};
```

## 🚀 Performance Optimizations

- **Memoized Selectors**: Prevent unnecessary re-renders
- **Normalized State**: Efficient data structure
- **Lazy Loading**: Load data when needed
- **Pagination**: Handle large datasets
- **Caching**: Smart data caching

## 🔧 Development Tools

- **Redux DevTools**: Debug state changes
- **Logger Middleware**: Log all actions
- **Time Travel**: Debug with time travel
- **Hot Reloading**: Fast development

## 📱 Integration with React Native

- **AsyncStorage**: Persistent auth state
- **Network Info**: Online/offline status
- **Background Sync**: Background data sync
- **Push Notifications**: State-aware notifications

## 🎯 Next Steps

1. **Add More Slices**: Notifications, Settings, etc.
2. **Implement Caching**: Smart data caching
3. **Add Offline Support**: Queue actions when offline
4. **Performance Monitoring**: Track state performance
5. **Testing**: Add comprehensive tests

This Redux setup provides a solid foundation for scalable state management in your Anaemia app! 🎉
