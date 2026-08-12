import { api } from '@/lib/api';

export type ChangeRequestType =
  | 'CARD_CREATE'
  | 'CARD_UPDATE'
  | 'CARD_DELETE'
  | 'COLUMN_CREATE'
  | 'PROJECT_CREATE';

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ChangeRequest {
  id: string;
  organizationId: string;
  projectId: string | null;
  type: ChangeRequestType;
  status: ChangeRequestStatus;
  payload: {
    title?: string;
    description?: string | null;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    type?: 'EPIC' | 'STORY' | 'TASK' | 'BUG' | 'SUBTASK';
    dueDate?: string | null;
    assigneeIds?: string[];
    labelIds?: string[];
    blockerIds?: string[];
    name?: string;
    reason?: string;
  };
  targetCardId: string | null;
  targetColumnId: string | null;
  requestedById: string;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  requestedBy: { id: string; name: string; email: string };
  reviewedBy: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  targetCard: { id: string; title: string } | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// Talep gonderirken kullanilan govde: backend'deki discriminated union ile ayni
export type CreateRequestBody =
  | { type: 'CARD_CREATE'; targetColumnId: string; payload: ChangeRequest['payload'] }
  | { type: 'CARD_UPDATE'; targetCardId: string; payload: ChangeRequest['payload'] }
  | { type: 'CARD_DELETE'; targetCardId: string; payload?: { reason?: string } }
  | { type: 'COLUMN_CREATE'; projectId: string; payload: { name: string; wipLimit?: number | null } }
  | { type: 'PROJECT_CREATE'; payload: { name: string; description?: string | null } };

export const requestsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getChangeRequests: builder.query<ChangeRequest[], { orgId: string; status?: ChangeRequestStatus }>({
      query: ({ orgId, status }) =>
        `/organizations/${orgId}/requests${status ? `?status=${status}` : ''}`,
      transformResponse: (response: ApiEnvelope<ChangeRequest[]>) => response.data,
      providesTags: (_r, _e, { orgId }) => [{ type: 'ChangeRequest', id: orgId }],
    }),

    createChangeRequest: builder.mutation<ChangeRequest, { orgId: string; body: CreateRequestBody }>({
      query: ({ orgId, body }) => ({
        url: `/organizations/${orgId}/requests`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<ChangeRequest>) => response.data,
      invalidatesTags: (_r, _e, { orgId }) => [{ type: 'ChangeRequest', id: orgId }],
    }),

    reviewChangeRequest: builder.mutation<
      ChangeRequest,
      { orgId: string; requestId: string; action: 'approve' | 'reject'; note?: string; payload?: any }
    >({
      query: ({ requestId, action, note, payload }) => ({
        url: `/requests/${requestId}/review?action=${action}`,
        method: 'POST',
        body: { note, payload },
      }),
      transformResponse: (response: ApiEnvelope<ChangeRequest>) => response.data,
      // Onay kart/kolon/proje olusturabildigi icin ilgili listeler de tazelenmeli
      invalidatesTags: (_r, _e, { orgId }) => [
        { type: 'ChangeRequest', id: orgId },
        'Project',
        'Card',
        'Notification',
      ],
    }),
  }),
});

export const {
  useGetChangeRequestsQuery,
  useCreateChangeRequestMutation,
  useReviewChangeRequestMutation,
} = requestsApi;

// Talep turunu insan diline cevirir
export function requestTypeLabel(type: ChangeRequestType): string {
  switch (type) {
    case 'CARD_CREATE':
      return 'Yeni kart';
    case 'CARD_UPDATE':
      return 'Kart düzenleme';
    case 'CARD_DELETE':
      return 'Kart silme';
    case 'COLUMN_CREATE':
      return 'Yeni sütun';
    case 'PROJECT_CREATE':
      return 'Yeni proje';
  }
}
