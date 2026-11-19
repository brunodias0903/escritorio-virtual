import { createAuthApi } from '@/features/auth/api/authApi';

import { API_URL } from './config';

export const authApi = createAuthApi({ baseUrl: API_URL });
