import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserApi } from "../api/configApi";
import { getStoredToken } from "../api/axiosClient";
import FullScreenLoader from "../components/Loader/FullScreenLoader";

export default function RootLoader() {
    const navigate = useNavigate();
    useEffect(() => {
        let active = true;
        const resolveSession = async () => {
            if (!getStoredToken()) { navigate("/login", { replace: true }); return; }
            try {
                const user = await getUserApi();
                if (active && user?.email) navigate("/dashboard", { replace: true, state: { email: user.email } });
                else if (active) navigate("/login", { replace: true });
            } catch {
                if (active) navigate("/login", { replace: true });
            }
        };
        void resolveSession();
        return () => { active = false; };
    }, [navigate]);
    return <FullScreenLoader message="Checking your config portal session…" />;
}
