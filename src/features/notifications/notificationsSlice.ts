import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  message: string;
  cardId?: string;
  card?: { id: string; title: string };
  invitation?: { id: string; status: string } | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsState {
  items: NotificationItem[];
}

const initialState: NotificationsState = {
  items: [],
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<NotificationItem[]>) {
      state.items = action.payload;
    },
    addNotification(state, action: PayloadAction<NotificationItem>) {
      state.items.unshift(action.payload);
    },
    markNotificationAsRead(state, action: PayloadAction<string>) {
      const notif = state.items.find((n) => n.id === action.payload);
      if (notif) notif.read = true;
    },
    markAllNotificationsAsRead(state) {
      state.items.forEach((n) => { n.read = true; });
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;
