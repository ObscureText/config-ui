import React from "react";
import { Braces } from "lucide-react";
import "./FullScreenLoader.css";

interface FullScreenLoaderProps {
    message?: string;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ message = "Verifying session..." }) => {
    return (
        <div className="loader-container">
            <div className="loader-card">
                <div className="loader-brand">
                    <div className="loader-logo">
                        <Braces size={26} />
                    </div>
                    <span className="loader-title">Config Studio</span>
                </div>
                <div className="spinner spinner-lg"></div>
                <p className="loader-text">{message}</p>
            </div>
        </div>
    );
};

export default FullScreenLoader;
