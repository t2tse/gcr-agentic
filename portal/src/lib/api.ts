import axios, { AxiosInstance } from 'axios';

const CHECKMATE_API = process.env.NEXT_PUBLIC_CHECKMATE_API || 'http://localhost:3001/api/checkmate';
const STASH_API = process.env.NEXT_PUBLIC_STASH_API || 'http://localhost:3002/api/stash';

type ServiceType = 'checkmate' | 'stash';
let reportErrorCallback: ((service: ServiceType, isError: boolean) => void) | null = null;

export const setApiErrorReporter = (callback: (service: ServiceType, isError: boolean) => void) => {
    reportErrorCallback = callback;
};

const createApiInstance = (baseURL: string, service: ServiceType): AxiosInstance => {
    const instance = axios.create({ baseURL });

    instance.interceptors.response.use(
        (response) => {
            reportErrorCallback?.(service, false);
            return response;
        },
        (error) => {
            // Only report connectivity errors (status code 0 or no response)
            if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
                reportErrorCallback?.(service, true);
            } else {
                // If we got a response, the service is "up" even if it returned an error (e.g. 404, 500)
                // However, for the purpose of "Service Unavailable", we might want to consider 503/504 as well
                if (error.response.status >= 500) {
                    // Optional: treat 5xx as service error? For now stick to connectivity.
                }
            }
            return Promise.reject(error);
        }
    );

    return instance;
};

const checkmateAxios = createApiInstance(CHECKMATE_API, 'checkmate');
const stashAxios = createApiInstance(STASH_API, 'stash');

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
            return checkmateAxios.get<{ lists: CheckmateList[], inboxCount: number }>(`/lists`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        createList: async (getToken: () => Promise<string | null>, title: string, color?: string, icon?: string) => {
            const token = await getToken();
            return checkmateAxios.post<CheckmateList>(`/lists`, { title, color, icon }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        updateList: async (getToken: () => Promise<string | null>, id: string, data: Partial<CheckmateList>) => {
            const token = await getToken();
            return checkmateAxios.patch<CheckmateList>(`/lists/${id}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        deleteList: async (getToken: () => Promise<string | null>, id: string) => {
            const token = await getToken();
            return checkmateAxios.delete(`/lists/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        clearListTasks: async (getToken: () => Promise<string | null>, id: string) => {
            const token = await getToken();
            return checkmateAxios.delete(`/lists/${id}/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        getTasks: async (getToken: () => Promise<string | null>, listId?: string, status?: string) => {
            const headers = await getAuthHeader(getToken);
            const params: any = {};
            if (listId) params.listId = listId;
            if (status) params.status = status;
            return checkmateAxios.get(`/tasks`, { headers, params });
        },
        createTask: async (getToken: any, data: any) => {
            const headers = await getAuthHeader(getToken);
            return checkmateAxios.post(`/tasks`, data, { headers });
        },
        updateTask: async (getToken: any, id: string, data: any) => {
            const headers = await getAuthHeader(getToken);
            return checkmateAxios.patch(`/tasks/${id}`, data, { headers });
        },
        deleteTask: async (getToken: any, id: string) => {
            const headers = await getAuthHeader(getToken);
            return checkmateAxios.delete(`/tasks/${id}`, { headers });
        },
        getStats: async (getToken: any) => {
            const headers = await getAuthHeader(getToken);
            return checkmateAxios.get(`/tasks/stats`, { headers });
        }
    },
    stash: {
        getLinks: async (getToken: any, tag?: string) => {
            const headers = await getAuthHeader(getToken);
            return stashAxios.get(`/links`, { headers, params: { tag } });
        },
        createLink: async (getToken: any, url: string, generateSummary?: boolean, autoTag?: boolean) => {
            const headers = await getAuthHeader(getToken);
            return stashAxios.post(`/links`, { url, generateSummary, autoTag }, { headers });
        },
        getStats: async (getToken: any) => {
            const headers = await getAuthHeader(getToken);
            return stashAxios.get(`/links/stats`, { headers });
        },
        deleteLink: async (getToken: any, id: string) => {
            const headers = await getAuthHeader(getToken);
            return stashAxios.delete(`/links/${id}`, { headers });
        }
    }
};
