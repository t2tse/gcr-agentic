import axios from 'axios';

const CHECKMATE_API = process.env.NEXT_PUBLIC_CHECKMATE_API || 'http://localhost:3001/api/checkmate';
const STASH_API = process.env.NEXT_PUBLIC_STASH_API || 'http://localhost:3002/api/stash';

const getAuthHeader = async (getToken: () => Promise<string | null>) => {
    const token = await getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
};

export interface CheckmateList {
    id: string;
    title: string;
    color?: string;
    icon?: string;
    taskCount?: number;
}

export const api = {
    checkmate: {
        getLists: async (getToken: () => Promise<string | null>) => {
            const token = await getToken();
            return axios.get<{ lists: CheckmateList[], inboxCount: number }>(`${CHECKMATE_API}/lists`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        createList: async (getToken: () => Promise<string | null>, title: string, color?: string, icon?: string) => {
            const token = await getToken();
            return axios.post<CheckmateList>(`${CHECKMATE_API}/lists`, { title, color, icon }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        updateList: async (getToken: () => Promise<string | null>, id: string, data: Partial<CheckmateList>) => {
            const token = await getToken();
            return axios.patch<CheckmateList>(`${CHECKMATE_API}/lists/${id}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        deleteList: async (getToken: () => Promise<string | null>, id: string) => {
            const token = await getToken();
            return axios.delete(`${CHECKMATE_API}/lists/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        clearListTasks: async (getToken: () => Promise<string | null>, id: string) => {
            const token = await getToken();
            return axios.delete(`${CHECKMATE_API}/lists/${id}/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        getTasks: async (getToken: () => Promise<string | null>, listId?: string, status?: string) => {
            const headers = await getAuthHeader(getToken);
            const params: any = {};
            if (listId) params.listId = listId;
            if (status) params.status = status;
            return axios.get(`${CHECKMATE_API}/tasks`, { headers, params });
        },
        createTask: async (getToken: any, data: any) => {
            const headers = await getAuthHeader(getToken);
            return axios.post(`${CHECKMATE_API}/tasks`, data, { headers });
        },
        updateTask: async (getToken: any, id: string, data: any) => {
            const headers = await getAuthHeader(getToken);
            return axios.patch(`${CHECKMATE_API}/tasks/${id}`, data, { headers });
        },
        deleteTask: async (getToken: any, id: string) => {
            const headers = await getAuthHeader(getToken);
            return axios.delete(`${CHECKMATE_API}/tasks/${id}`, { headers });
        },
        getStats: async (getToken: any) => {
            const headers = await getAuthHeader(getToken);
            return axios.get(`${CHECKMATE_API}/tasks/stats`, { headers });
        }
    },
    stash: {
        getLinks: async (getToken: any, tag?: string) => {
            const headers = await getAuthHeader(getToken);
            return axios.get(`${STASH_API}/links`, { headers, params: { tag } });
        },
        createLink: async (getToken: any, url: string, generateSummary?: boolean, autoTag?: boolean) => {
            const headers = await getAuthHeader(getToken);
            return axios.post(`${STASH_API}/links`, { url, generateSummary, autoTag }, { headers });
        },
        getStats: async (getToken: any) => {
            const headers = await getAuthHeader(getToken);
            return axios.get(`${STASH_API}/links/stats`, { headers });
        },
        deleteLink: async (getToken: any, id: string) => {
            const headers = await getAuthHeader(getToken);
            return axios.delete(`${STASH_API}/links/${id}`, { headers });
        }
    }
};
