import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Backend .env dosyasındaki NEXT_PUBLIC_API_URL'den beslenecek (backend 4000 portunda calisiyor)
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface LoginCredentials {
  email: string;
  password: string;
}

// Backend her zaman { success, data } zarfiyla donuyor (successResponse/errorResponse) -
// buradaki tipler o ham teli yansitir, RegisterForm/LoginForm .data.xxx ile okur.
interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: { id: string; name: string; email: string };
  };
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  success: boolean;
  data: {
    verificationRequired: boolean;
    email: string;
  };
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginCredentials>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<RegisterResponse, RegisterInput>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    forgotPassword: builder.mutation<unknown, { email: string }>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: builder.mutation<unknown, { token: string; password: string }>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),
    verifyEmail: builder.mutation<unknown, { token: string }>({
      query: (body) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body,
      }),
    }),
    resendVerification: builder.mutation<unknown, { email: string }>({
      query: (body) => ({
        url: '/auth/resend-verification',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
} = authApi;