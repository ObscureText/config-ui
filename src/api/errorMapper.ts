import axios from "axios";
import type { ApiErrorResponse } from "../types/config";

const messages: Record<string, string> = {
    CONFIG_ERROR_BAD_REQUEST: "Bad request. Check the details and try again.",
    CONFIG_ERROR_UNAUTHORIZED: "Your session is invalid. Please sign in again.",
    CONFIG_ERROR_TOKEN_EXPIRED: "Your session expired. Please sign in again.",
    CONFIG_ERROR_NOT_FOUND: "No configuration was found for this source.",
    CONFIG_ERROR_INTERNAL_SERVER_ERROR: "We couldn't process your request. Please try again.",
};

export function mapApiError(error: unknown, fallbackMessage = "Something went wrong. Please try again."): string {
    if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data as ApiErrorResponse | undefined;
        if (data?.error_code && messages[data.error_code]) return messages[data.error_code];
        if (data?.error_message) return data.error_message;
        if (error.response.status === 401) return messages.CONFIG_ERROR_UNAUTHORIZED;
        if (error.response.status >= 500) return messages.CONFIG_ERROR_INTERNAL_SERVER_ERROR;
    }
    return error instanceof Error ? error.message : fallbackMessage;
}
