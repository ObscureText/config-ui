import axiosClient from "./axiosClient";
import axios from "axios";
import type { ApiErrorResponse, ConfigCodes, ConfigReadResult, LoginResponse, User } from "../types/config";

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
    const response = await axiosClient.post<LoginResponse>("/api/config/auth/login", { email, password });
    return response.data;
}

export async function getUserApi(): Promise<User> {
    const response = await axiosClient.get<User>("/api/config/user");
    return response.data;
}

export async function getConfigCodesApi(): Promise<ConfigCodes> {
    const response = await axiosClient.get<ConfigCodes>("/api/config/portal/config-codes");
    return response.data;
}

export async function getBackendConfigApi(serviceCode: string): Promise<ConfigReadResult> {
    return readConfig("/api/config/portal/backend-config", { code: serviceCode });
}

export async function getFrontendConfigApi(code: string): Promise<ConfigReadResult> {
    return readConfig("/api/config/portal/frontend-config", { code });
}

async function readConfig(path: string, params: Record<string, string>): Promise<ConfigReadResult> {
    try {
        const response = await axiosClient.get<unknown>(path, { params });
        return { status: "found", config: response.data };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const data = error.response?.data as ApiErrorResponse | undefined;
            if (data?.error_code === "CONFIG_ERROR_NOT_FOUND") return { status: "not_found" };
        }
        throw error;
    }
}

export async function initBackendConfigApi(code: string, config: unknown): Promise<unknown> {
    const response = await axiosClient.post<unknown>("/api/config/portal/backend-config/init", config, {
        params: { code },
    });
    return response.data;
}

export async function updateBackendConfigApi(code: string, config: unknown): Promise<unknown> {
    const response = await axiosClient.put<unknown>("/api/config/portal/backend-config", config, { params: { code } });
    return response.data;
}

export async function initFrontendConfigApi(code: string, config: unknown): Promise<unknown> {
    const response = await axiosClient.post<unknown>("/api/config/portal/frontend-config/init", config, {
        params: { code },
    });
    return response.data;
}

export async function updateFrontendConfigApi(code: string, config: unknown): Promise<unknown> {
    const response = await axiosClient.put<unknown>("/api/config/portal/frontend-config", config, { params: { code } });
    return response.data;
}
