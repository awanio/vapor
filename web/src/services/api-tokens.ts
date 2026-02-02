import { api } from '../api';

export interface ApiToken {
    id: string;
    name: string;
    username: string;
    last_used_at?: string;
    expires_at?: string;
    created_at: string;
}

export interface CreateTokenRequest {
    name: string;
    expires_at?: number | null;
}

export interface CreateTokenResponse {
    token: string;
    token_info: ApiToken;
}

export const apiTokensService = {
    async listTokens(): Promise<ApiToken[]> {
        // api.get unwraps the response.data
        const response = await api.get('/auth/tokens');
        return response || [];
    },

    async createToken(data: CreateTokenRequest): Promise<CreateTokenResponse> {
        const response = await api.post('/auth/tokens', {
            name: data.name,
            expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        });
        return response;
    },

    async revokeToken(id: string): Promise<void> {
        await api.delete(`/auth/tokens/${id}`);
    },

    async getToken(id: string): Promise<ApiToken> {
        return await api.get(`/auth/tokens/${id}`);
    }
};
