import { api } from '@/lib/api';
import type { Priority, TaskLabel } from '@/features/board/services/boardService';

export interface AssignedCard {
  id: string;
  title: string;
  priority: Priority;
  storyPoints: number | null;
  dueDate: string | null;
  lastActivityAt: string;
  columnId: string;
  columnName: string;
  projectId: string;
  projectName: string;
  organizationId: string;
  organizationName: string;
  labels: TaskLabel[];
  isBlocked: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyAssignedCards: builder.query<AssignedCard[], void>({
      query: () => '/me/assigned-cards',
      transformResponse: (response: ApiEnvelope<AssignedCard[]>) => response.data,
      providesTags: ['MyAssignedCards'],
      // 'MyAssignedCards' etiketini gecersiz kilan hicbir mutasyon yok: kart
      // atama/tasima/silme islemleri boardService (plain fetch) uzerinden
      // gidiyor, RTK bunlari hic gormuyor. Ustune varsayilan 60 sn'lik
      // keepUnusedDataFor penceresi de devrede oldugu icin kullanici panoda
      // karti Done'a tasiyip geri donunce liste hala eski kartlari
      // gosteriyordu - tek cikis sert sayfa yenilemesiydi. 0 vererek sayfadan
      // ayrilir ayrilmaz cache'i dusuruyoruz, dashboard'a her donuste taze
      // veri cekiliyor. Sayfa ACIKKEN gelen atamalar icin ayrica
      // useRealtimeNotifications bu etiketi gecersiz kiliyor.
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetMyAssignedCardsQuery } = dashboardApi;
