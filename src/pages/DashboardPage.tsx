import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Braces, Check, ChevronRight, CircleAlert, Code2, Database, LogOut, RefreshCw, Search, ShieldCheck, UserRound } from "lucide-react";
import { getBackendConfigApi, getConfigCodesApi, getFrontendConfigApi, getUserApi } from "../api/configApi";
import { clearStoredToken, getStoredToken } from "../api/axiosClient";
import type { ConfigCodes, User } from "../types/config";
import FullScreenLoader from "../components/Loader/FullScreenLoader";
import { mapApiError } from "../api/errorMapper";
import "./DashboardPage.css";

type Source = { kind: "frontend" | "backend"; code: string };
const cacheKey = ({ kind, code }: Source) => `${kind}:${code}`;

export default function DashboardPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<User | null>(location.state?.email ? { email: location.state.email } : null);
    const [codes, setCodes] = useState<ConfigCodes | null>(null);
    const [codesLoading, setCodesLoading] = useState(true);
    const [codesError, setCodesError] = useState("");
    const [active, setActive] = useState<Source | null>(null);
    const [cache, setCache] = useState<Record<string, unknown>>({});
    const [loadingKey, setLoadingKey] = useState("");
    const [detailError, setDetailError] = useState("");
    const [search, setSearch] = useState("");
    const requestId = useRef(0);

    const logout = useCallback(() => {
        clearStoredToken();
        navigate("/login", { replace: true });
    }, [navigate]);

    useEffect(() => {
        if (!getStoredToken()) { navigate("/login", { replace: true }); return; }
        if (!user) getUserApi().then(setUser).catch(logout);
    }, [logout, navigate, user]);

    const loadCodes = useCallback(async () => {
        setCodesLoading(true);
        setCodesError("");
        try {
            const result = await getConfigCodesApi();
            setCodes({ frontend_codes: result.frontend_codes ?? [], backend_codes: result.backend_codes ?? [] });
        } catch (error) {
            setCodesError(mapApiError(error, "Could not load the available config sources."));
            if (getStoredToken() && (error as { response?: { status?: number } })?.response?.status === 401) logout();
        } finally { setCodesLoading(false); }
    }, [logout]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadCodes(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadCodes]);

    const sources = useMemo(() => {
        const all: Source[] = [
            ...(codes?.frontend_codes ?? []).map((code) => ({ kind: "frontend" as const, code })),
            ...(codes?.backend_codes ?? []).map((code) => ({ kind: "backend" as const, code })),
        ];
        const query = search.trim().toLowerCase();
        return query ? all.filter((item) => item.code.toLowerCase().includes(query)) : all;
    }, [codes, search]);

    const fetchSource = useCallback(async (source: Source, force = false) => {
        const currentRequest = ++requestId.current;
        const key = cacheKey(source);
        setActive(source);
        setDetailError("");
        if (!force && Object.prototype.hasOwnProperty.call(cache, key)) {
            setLoadingKey("");
            return;
        }
        setLoadingKey(key);
        try {
            const config = source.kind === "backend" ? await getBackendConfigApi(source.code) : await getFrontendConfigApi(source.code);
            setCache((previous) => ({ ...previous, [key]: config }));
        } catch (error) {
            if (requestId.current === currentRequest) setDetailError(mapApiError(error, "Could not load this configuration."));
            if ((error as { response?: { status?: number } })?.response?.status === 401) logout();
        } finally { if (requestId.current === currentRequest) setLoadingKey(""); }
    }, [cache, logout]);

    const activeKey = active ? cacheKey(active) : "";
    const isDetailLoading = !!activeKey && loadingKey === activeKey;
    const currentConfig = active ? cache[activeKey] : undefined;
    const serializedConfig = currentConfig === undefined ? "" : JSON.stringify(currentConfig, null, 2);

    if (!user) return <FullScreenLoader message="Loading your workspace…" />;

    return <div className="portal-shell">
        <header className="portal-header">
            <a className="brand" href="/" aria-label="Config Studio home"><span className="brand-mark"><Braces size={21} /></span><span><strong>Config Studio</strong><small>PORTAL</small></span></a>
            <div className="header-right"><span className="secure-pill"><ShieldCheck size={15} /> Secure workspace</span><span className="user-badge" aria-label={`Signed in as ${user.email}`}><span className="user-avatar"><UserRound size={15} /></span><span className="user-identity"><small>Signed in as</small><span className="user-email">{user.email}</span></span></span><button className="logout-button" onClick={logout} title="Sign out"><LogOut size={16} /><span>Sign out</span></button></div>
        </header>

        <main className="portal-main">
            <section className="welcome-row"><div><div className="eyebrow">CONFIGURATION CONTROL</div><h1>Your services, in one place.</h1><p>Browse frontend and backend settings. Select a source to inspect its latest saved configuration.</p></div><button className="refresh-button" onClick={() => { void loadCodes(); if (active) void fetchSource(active, true); }} disabled={codesLoading || !!loadingKey}><RefreshCw size={16} className={codesLoading || !!loadingKey ? "refreshing" : ""} />Refresh data</button></section>

            <section className="stats-grid"><div className="stat-card"><span className="stat-icon frontend-icon"><Code2 size={19} /></span><div><strong>{codesLoading ? "—" : codes?.frontend_codes.length ?? 0}</strong><span>Frontend sources</span></div></div><div className="stat-card"><span className="stat-icon backend-icon"><Database size={19} /></span><div><strong>{codesLoading ? "—" : codes?.backend_codes.length ?? 0}</strong><span>Backend services</span></div></div><div className="stat-card"><span className="stat-icon saved-icon"><Check size={19} /></span><div><strong>{Object.keys(cache).length}</strong><span>Loaded this session</span></div></div></section>

            <section className="browser-layout">
                <aside className="source-panel">
                    <div className="source-heading"><div><h2>Sources</h2><span>Choose a config to inspect</span></div><button className="icon-button" onClick={() => void loadCodes()} title="Refresh source list" disabled={codesLoading}><RefreshCw size={16} className={codesLoading ? "refreshing" : ""} /></button></div>
                    <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by code…" /></label>
                    {codesError && <div className="inline-alert"><CircleAlert size={16} /><span>{codesError}</span><button onClick={() => void loadCodes()}>Retry</button></div>}
                    {codesLoading && !codes ? <div className="source-skeleton"><i /><i /><i /><i /></div> : <div className="source-list">
                        {(["frontend", "backend"] as const).map((kind) => {
                            const items = sources.filter((item) => item.kind === kind);
                            return <div className="source-group" key={kind}><div className="group-label"><span className={`group-dot ${kind}`} />{kind === "frontend" ? "FRONTENDS" : "BACKENDS"}<span className="group-count">{items.length}</span></div>
                                {items.map((item) => { const key = cacheKey(item); const selected = activeKey === key; return <button key={key} className={`source-item ${selected ? "selected" : ""}`} onClick={() => void fetchSource(item)}><span className={`source-symbol ${kind}`}>{kind === "frontend" ? <Code2 size={16} /> : <Database size={16} />}</span><span className="source-code">{item.code}</span>{cache[key] !== undefined && <Check className="cached-check" size={15} />}{selected && <ChevronRight className="selected-chevron" size={16} />}</button>; })}
                                {items.length === 0 && <p className="empty-group">{search ? "No matching sources" : "No sources configured"}</p>}
                            </div>;
                        })}
                    </div>}
                    {!codesLoading && !codesError && sources.length === 0 && search && <p className="no-results">No source codes match “{search}”.</p>}
                </aside>

                <section className="detail-panel">
                    {!active ? <div className="empty-detail"><div className="empty-art"><Braces size={31} /></div><h2>Configuration viewer</h2><p>Select a frontend or backend source to view its saved JSON configuration.</p><span><ShieldCheck size={14} /> Authenticated access</span></div> : <>
                        <div className="detail-heading"><div className="detail-title"><span className={`detail-icon ${active.kind}`}>{active.kind === "backend" ? <Database size={18} /> : <Code2 size={18} />}</span><div><div className="detail-kicker">{active.kind === "backend" ? "BACKEND SERVICE" : "FRONTEND APP"}</div><h2>{active.code}</h2></div></div><button className="icon-button" onClick={() => void fetchSource(active, true)} disabled={isDetailLoading} title="Reload this config"><RefreshCw size={16} className={isDetailLoading ? "refreshing" : ""} /></button></div>
                        <div className="code-meta"><span><span className="live-dot" />Saved configuration</span><span>JSON</span></div>
                        <div className="code-viewer">{isDetailLoading ? <div className="detail-loading"><span className="spinner" /><strong>Loading configuration</strong><span>Fetching the latest saved version…</span></div> : detailError ? <div className="detail-error"><CircleAlert size={21} /><strong>Couldn’t load this configuration</strong><span>{detailError}</span><button className="retry-button" onClick={() => void fetchSource(active, true)}>Try again</button></div> : currentConfig !== undefined ? <pre><code>{serializedConfig}</code></pre> : <div className="detail-loading"><span className="spinner" /><strong>Preparing viewer…</strong></div>}</div>
                        <footer className="viewer-footer"><span><span className="live-dot" />Read-only view</span><span>{currentConfig === undefined ? "—" : `${serializedConfig.split("\n").length} lines`}</span></footer>
                    </>}
                </section>
            </section>
            <footer className="page-footer">Config Studio <span>·</span> Secure configuration access</footer>
        </main>
    </div>;
}
