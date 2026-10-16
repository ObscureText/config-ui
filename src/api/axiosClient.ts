import axios from "axios";

const TOKEN_KEY = "access_token";

export const getStoredToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token");
};

export const setStoredToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("token", token);
};

export const clearStoredToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("token");
};

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8085",
    headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.request.use(
    (config) => {
        const token = getStoredToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

export default axiosClient;
