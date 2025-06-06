import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import queueReducer from './slices/queueSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    queue: queueReducer,
    ui: uiReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
}); 