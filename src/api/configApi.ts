import axiosClient from "./axiosClient";
import type { ConfigCodes, LoginResponse, User } from "../types/config";

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

export async function getBackendConfigApi(serviceCode: string): Promise<unknown> {
    const response = await axiosClient.get<unknown>("/api/config/portal/backend-config", {
        params: { code: serviceCode },
    });
    return response.data;
}

export async function getFrontendConfigApi(code: string): Promise<unknown> {
    const response = await axiosClient.get<unknown>("/api/config/portal/frontend-config", { params: { code } });
    return response.data;
}
