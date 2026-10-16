import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Braces, AlertCircle, Lock, Mail } from "lucide-react";
import { loginApi } from "../api/configApi";
import { setStoredToken } from "../api/axiosClient";
import { mapApiError } from "../api/errorMapper";
import "./LoginPage.css";

interface FormFields {
    email: string;
    password: string;
}

interface FormErrors {
    email?: string;
    password?: string;
    common?: string;
}

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState<FormFields>({
        email: "",
        password: "",
    });

    // Single state object managing field-level and common errors
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState<boolean>(false);

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        const emailTrimmed = form.email.trim();
        if (!emailTrimmed) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!form.password) {
            newErrors.password = "Password is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field: keyof FormFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        // Clear inline error for field and common error when typing
        if (errors[field] || errors.common) {
            setErrors((prev) => ({ ...prev, [field]: undefined, common: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const response = await loginApi(form.email.trim(), form.password);

            if (response && response.access_token) {
                setStoredToken(response.access_token);
                // Successful login: store token and navigate to '/' route
                navigate("/", { replace: true });
            } else {
                setErrors({ common: "Authentication failed. No token received." });
                setLoading(false);
            }
        } catch (err: unknown) {
            // Map error code to error message in mapped layer
            const errorMessage = mapApiError(err);
            setErrors({ common: errorMessage });
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <Braces size={28} />
                    </div>
                    <h1 className="login-title">Config Studio</h1>
                    <p className="login-subtitle">Sign in to explore your frontend and backend configuration.</p>
                </div>

                {errors.common && (
                    <div className="common-error-banner">
                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                        <span>{errors.common}</span>
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">
                            Email Address
                        </label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={18} />
                            <input
                                id="email"
                                type="email"
                                className={`form-input ${errors.email ? "has-error" : ""}`}
                                placeholder="admin@example.com"
                                value={form.email}
                                onChange={handleChange("email")}
                                disabled={loading}
                            />
                        </div>
                        {errors.email && (
                            <span className="inline-error">
                                <AlertCircle size={14} />
                                {errors.email}
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Password
                        </label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                id="password"
                                type="password"
                                className={`form-input ${errors.password ? "has-error" : ""}`}
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange("password")}
                                disabled={loading}
                            />
                        </div>
                        {errors.password && (
                            <span className="inline-error">
                                <AlertCircle size={14} />
                                {errors.password}
                            </span>
                        )}
                    </div>

                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ?
                            <>
                                <div className="spinner"></div>
                                <span>Signing in...</span>
                            </>
                        :   <span>Continue to workspace</span>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
