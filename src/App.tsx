import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RootLoader from "./pages/RootLoader";

export default function App() {
    return <BrowserRouter><Routes>
        <Route path="/" element={<RootLoader />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></BrowserRouter>;
}
