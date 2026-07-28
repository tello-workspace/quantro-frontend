import { configureStore } from '@reduxjs/toolkit'
import { api } from './api'
import { authApi } from '@/features/auth/authApi'
import notificationsReducer from '@/features/notifications/notificationsSlice'

// Next.js SSR (Server Side Rendering) için her istekte sıfır store oluşturacak fonksiyon
export const makeStore = () => {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      [authApi.reducerPath]: authApi.reducer,
      notifications: notificationsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware, authApi.middleware),
  })
}

// Tip tanımlamaları (StoreProvider veya diğer bileşenlerin hata vermemesi için)
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
