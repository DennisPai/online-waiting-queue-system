import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  isLoading: false,
  alert: {
    open: false,
    message: '',
    severity: 'info' // 'error', 'warning', 'info', 'success'
  },
  drawer: {
    open: false
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    showAlert: (state, action) => {
      state.alert = {
        open: true,
        message: action.payload.message,
        severity: action.payload.severity || 'info'
      };
    },
    hideAlert: (state) => {
      state.alert.open = false;
    },
    toggleDrawer: (state, action) => {
      state.drawer.open = action.payload !== undefined ? action.payload : !state.drawer.open;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    }
  }
});

export const {
  setLoading,
  showAlert,
  hideAlert,
  toggleDrawer,
  addNotification,
  removeNotification
} = uiSlice.actions;

export default uiSlice.reducer; 