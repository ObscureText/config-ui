export interface User { email: string }
export interface LoginResponse { access_token: string }
export interface ConfigCodes { frontend_codes: string[]; backend_codes: string[] }
export interface ApiErrorResponse { error_code?: string; error_message?: string }
