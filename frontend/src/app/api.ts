import { createAuthApi } from '@/features/auth/api/authApi';
import { createWorkspaceApi } from '@/features/workspace/api/workspaceApi';

import { API_URL } from './config';

export const authApi = createAuthApi({ baseUrl: API_URL });
export const workspaceApi = createWorkspaceApi({ baseUrl: API_URL });
