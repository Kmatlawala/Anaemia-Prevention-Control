import {configureStore} from '@reduxjs/toolkit';
import authSlice from './authSlice';
import reportReducer from './reportSlice';
import beneficiaryReducer from './beneficiarySlice';
import appReducer from './appSlice';

const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authSlice,
    report: reportReducer,
    beneficiary: beneficiaryReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: __DEV__,
});

export default store;
