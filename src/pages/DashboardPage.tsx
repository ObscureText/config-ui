import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Braces,
    Check,
    ChevronRight,
    CircleAlert,
    Code2,
    Database,
    LogOut,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
    Pencil,
    X,
    Save,
    Plus,
    AlignLeft,
} from "lucide-react";
import {
    getBackendConfigApi,
    getConfigCodesApi,
    getFrontendConfigApi,
    getUserApi,
    initBackendConfigApi,
    initFrontendConfigApi,
    updateBackendConfigApi,
    updateFrontendConfigApi,
} from "../api/configApi";
import { clearStoredToken, getStoredToken } from "../api/axiosClient";
import type { ConfigCodes, ConfigReadResult, User } from "../types/config";
import FullScreenLoader from "../components/Loader/FullScreenLoader";
import { mapApiError } from "../api/errorMapper";
import "./DashboardPage.css";

type Source = { kind: "frontend" | "backend"; code: string };
const cacheKey = ({ kind, code }: Source) => `${kind}:${code}`;

function highlightJson(value: string) {
    const tokenPattern = /"(?:\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:]/g;
    const parts = [];
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = tokenPattern.exec(value)) !== null) {
        if (match.index > cursor) parts.push(value.slice(cursor, match.index));
        const token = match[0];
        const next = value.slice(tokenPattern.lastIndex).match(/^\s*:/);
        const className = token.startsWith('"') ? (next ? "json-key" : "json-string")
            : token === "true" || token === "false" || token === "null" ? "json-literal"
            : /^[{}[\],:]$/.test(token) ? "json-punctuation" : "json-number";
        parts.push(<span className={className} key={`${match.index}-${token}`}>{token}</span>);
        cursor = tokenPattern.lastIndex;
    }
    if (cursor < value.length) parts.push(value.slice(cursor));
    return parts;
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<User | null>(location.state?.email ? { email: location.state.email } : null);
    const [codes, setCodes] = useState<ConfigCodes | null>(null);
    const [codesLoading, setCodesLoading] = useState(true);
    const [codesError, setCodesError] = useState("");
    const [active, setActive] = useState<Source | null>(null);
    const [cache, setCache] = useState<Record<string, ConfigReadResult>>({});
    const [loadingKey, setLoadingKey] = useState("");
    const [detailError, setDetailError] = useState("");
    const [actionError, setActionError] = useState("");
    const [editingKey, setEditingKey] = useState("");
    const [draft, setDraft] = useState("");
    const [editorError, setEditorError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [search, setSearch] = useState("");
    const requestId = useRef(0);
    const activeKey = active ? cacheKey(active) : "";

    const logout = useCallback(() => {
        clearStoredToken();
        navigate("/login", { replace: true });
    }, [navigate]);

    useEffect(() => {
        if (!getStoredToken()) {
            navigate("/login", { replace: true });
            return;
        }
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
        } finally {
            setCodesLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadCodes();
        }, 0);
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

    const fetchSource = useCallback(
        async (source: Source, force = false) => {
            const currentRequest = ++requestId.current;
            const key = cacheKey(source);
            if (key !== activeKey && editingKey) {
                setEditingKey("");
                setDraft("");
                setEditorError("");
            }
            setActive(source);
            setDetailError("");
            setActionError("");
            if (!force && Object.prototype.hasOwnProperty.call(cache, key)) {
                setLoadingKey("");
                return;
            }
            setLoadingKey(key);
            try {
                const result =
                    source.kind === "backend" ?
                        await getBackendConfigApi(source.code)
                    :   await getFrontendConfigApi(source.code);
                setCache((previous) => ({ ...previous, [key]: result }));
            } catch (error) {
                if (requestId.current === currentRequest)
                    setDetailError(mapApiError(error, "Could not load this configuration."));
                if ((error as { response?: { status?: number } })?.response?.status === 401) logout();
            } finally {
                if (requestId.current === currentRequest) setLoadingKey("");
            }
        },
        [activeKey, cache, editingKey, logout],
    );

    const activeResult = active ? cache[activeKey] : undefined;
    const isDetailLoading = !!activeKey && loadingKey === activeKey;
    const currentConfig = activeResult?.status === "found" ? activeResult.config : undefined;
    const serializedConfig = currentConfig === undefined ? "" : JSON.stringify(currentConfig, null, 4);
    const isEditing = editingKey === activeKey && !!activeKey;
    const isDirty = isEditing && draft !== serializedConfig;

    const initializeConfig = async (source: Source) => {
        const key = cacheKey(source);
        setActionLoading(true);
        setActionError("");
        try {
            const config =
                source.kind === "backend" ?
                    await initBackendConfigApi(source.code, {})
                :   await initFrontendConfigApi(source.code, {});
            setCache((previous) => ({ ...previous, [key]: { status: "found", config } }));
        } catch (error) {
            if ((error as { response?: { status?: number } })?.response?.status === 409) {
                await fetchSource(source, true);
                return;
            }
            setActionError(mapApiError(error, "Could not initialize this configuration."));
            if ((error as { response?: { status?: number } })?.response?.status === 401) logout();
        } finally {
            setActionLoading(false);
        }
    };

    const startEditing = () => {
        setDraft(serializedConfig);
        setEditorError("");
        setActionError("");
        setEditingKey(activeKey);
    };

    const cancelEditing = () => {
        setEditingKey("");
        setDraft("");
        setEditorError("");
    };

    const saveConfig = async () => {
        if (!active || !isDirty) return;
        let parsed: unknown;
        try {
            parsed = JSON.parse(draft);
        } catch {
            setEditorError("This is not valid JSON. Fix the syntax before saving.");
            return;
        }
        setActionLoading(true);
        setActionError("");
        setEditorError("");
        try {
            const config =
                active.kind === "backend" ?
                    await updateBackendConfigApi(active.code, parsed)
                :   await updateFrontendConfigApi(active.code, parsed);
            setCache((previous) => ({ ...previous, [activeKey]: { status: "found", config } }));
            setEditingKey("");
            setDraft("");
        } catch (error) {
            setEditorError(mapApiError(error, "Could not save this configuration."));
            if ((error as { response?: { status?: number } })?.response?.status === 401) logout();
        } finally {
            setActionLoading(false);
        }
    };

    if (!user) return <FullScreenLoader message="Loading your workspace…" />;

    return (
        <div className="portal-shell">
            <header className="portal-header">
                <a className="brand" href="/" aria-label="Config Studio home">
                    <span className="brand-mark">
                        <Braces size={21} />
                    </span>
                    <span>
                        <strong>Config Studio</strong>
                        <small>PORTAL</small>
                    </span>
                </a>
                <div className="header-right">
                    <span className="secure-pill">
                        <ShieldCheck size={15} /> Secure workspace
                    </span>
                    <span className="user-badge" aria-label={user.email}>
                        <span className="user-avatar" aria-hidden="true">
                            <UserRound size={15} />
                        </span>
                        <span className="user-email">{user.email}</span>
                    </span>
                    <button className="logout-button" onClick={logout} title="Sign out">
                        <LogOut size={16} />
                        <span>Sign out</span>
                    </button>
                </div>
            </header>

            <main className="portal-main">
                <section className="welcome-row">
                    <div>
                        <div className="eyebrow">CONFIGURATION CONTROL</div>
                        <h1>Your services, in one place.</h1>
                        <p>
                            Browse frontend and backend settings. Select a source to inspect its latest saved
                            configuration.
                        </p>
                    </div>
                    <button
                        className="refresh-button"
                        onClick={() => {
                            void loadCodes();
                            if (active) void fetchSource(active, true);
                        }}
                        disabled={codesLoading || !!loadingKey || isEditing || actionLoading}
                    >
                        <RefreshCw size={16} className={codesLoading || !!loadingKey ? "refreshing" : ""} />
                        Refresh data
                    </button>
                </section>

                <section className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-icon frontend-icon">
                            <Code2 size={19} />
                        </span>
                        <div>
                            <strong>{codesLoading ? "—" : (codes?.frontend_codes.length ?? 0)}</strong>
                            <span>Frontend sources</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon backend-icon">
                            <Database size={19} />
                        </span>
                        <div>
                            <strong>{codesLoading ? "—" : (codes?.backend_codes.length ?? 0)}</strong>
                            <span>Backend services</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon saved-icon">
                            <Check size={19} />
                        </span>
                        <div>
                            <strong>{Object.values(cache).filter((item) => item.status === "found").length}</strong>
                            <span>Configs loaded</span>
                        </div>
                    </div>
                </section>

                <section className="browser-layout">
                    <aside className="source-panel">
                        <div className="source-heading">
                            <div>
                                <h2>Sources</h2>
                                <span>Choose a config to inspect</span>
                            </div>
                            <button
                                className="icon-button"
                                onClick={() => void loadCodes()}
                                title="Refresh source list"
                                disabled={codesLoading}
                            >
                                <RefreshCw size={16} className={codesLoading ? "refreshing" : ""} />
                            </button>
                        </div>
                        <label className="search-box">
                            <Search size={16} />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Filter by code…"
                            />
                        </label>
                        {codesError && (
                            <div className="inline-alert">
                                <CircleAlert size={16} />
                                <span>{codesError}</span>
                                <button onClick={() => void loadCodes()}>Retry</button>
                            </div>
                        )}
                        {codesLoading && !codes ?
                            <div className="source-skeleton">
                                <i />
                                <i />
                                <i />
                                <i />
                            </div>
                        :   <div className="source-list">
                                {(["frontend", "backend"] as const).map((kind) => {
                                    const items = sources.filter((item) => item.kind === kind);
                                    return (
                                        <div className="source-group" key={kind}>
                                            <div className="group-label">
                                                <span className={`group-dot ${kind}`} />
                                                {kind === "frontend" ? "FRONTENDS" : "BACKENDS"}
                                                <span className="group-count">{items.length}</span>
                                            </div>
                                            {items.map((item) => {
                                                const key = cacheKey(item);
                                                const selected = activeKey === key;
                                                return (
                                                    <button
                                                        key={key}
                                                        className={`source-item ${selected ? "selected" : ""}`}
                                                        onClick={() => void fetchSource(item)}
                                                        disabled={actionLoading}
                                                    >
                                                        <span className={`source-symbol ${kind}`}>
                                                            {kind === "frontend" ?
                                                                <Code2 size={16} />
                                                            :   <Database size={16} />}
                                                        </span>
                                                        <span className="source-code">{item.code}</span>
                                                        {selected && (
                                                            <ChevronRight className="selected-chevron" size={16} />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                            {items.length === 0 && (
                                                <p className="empty-group">
                                                    {search ? "No matching sources" : "No sources configured"}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        }
                        {!codesLoading && !codesError && sources.length === 0 && search && (
                            <p className="no-results">No source codes match “{search}”.</p>
                        )}
                    </aside>

                    <section className="detail-panel">
                        {!active ?
                            <div className="empty-detail">
                                <div className="empty-art">
                                    <Braces size={31} />
                                </div>
                                <h2>Configuration viewer</h2>
                                <p>Select a frontend or backend source to view its saved JSON configuration.</p>
                                <span>
                                    <ShieldCheck size={14} /> Authenticated access
                                </span>
                            </div>
                        :   <>
                                <div className="detail-heading">
                                    <div className="detail-title">
                                        <span className={`detail-icon ${active.kind}`}>
                                            {active.kind === "backend" ?
                                                <Database size={18} />
                                            :   <Code2 size={18} />}
                                        </span>
                                        <div>
                                            <div className="detail-kicker">
                                                {active.kind === "backend" ? "BACKEND SERVICE" : "FRONTEND APP"}
                                            </div>
                                            <h2>{active.code}</h2>
                                        </div>
                                    </div>
                                    <div className="detail-actions">
                                        {activeResult?.status === "found" && !isEditing && (
                                            <button className="edit-button" onClick={startEditing}>
                                                <Pencil size={14} />
                                                Edit
                                            </button>
                                        )}
                                        {isEditing && (
                                            <button
                                                className="icon-button"
                                                onClick={cancelEditing}
                                                title="Cancel editing"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                        {!isEditing && (
                                            <button
                                                className="icon-button"
                                                onClick={() => void fetchSource(active, true)}
                                                disabled={isDetailLoading || actionLoading}
                                                title="Reload this config"
                                            >
                                                <RefreshCw size={16} className={isDetailLoading ? "refreshing" : ""} />
                                            </button>
                                        )}
                                        {isEditing && isDirty && (
                                            <button
                                                className="save-button"
                                                onClick={() => void saveConfig()}
                                                disabled={actionLoading}
                                            >
                                                <Save size={14} />
                                                {actionLoading ? "Saving…" : "Update"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="code-meta">
                                    <span>
                                        <span
                                            className={
                                                activeResult?.status === "not_found" ? "missing-dot" : "live-dot"
                                            }
                                        />
                                        {isEditing ?
                                            "Editing unsaved changes"
                                        : activeResult?.status === "not_found" ?
                                            "No config saved yet"
                                        :   "Saved configuration"}
                                    </span>
                                    <span>JSON</span>
                                </div>
                                <div className="code-viewer">
                                    {isDetailLoading || (actionLoading && activeResult?.status === "not_found") ?
                                        <div className="detail-loading">
                                            <span className="spinner" />
                                            <strong>
                                                {actionLoading ? "Initializing configuration" : "Loading configuration"}
                                            </strong>
                                            <span>
                                                {actionLoading ?
                                                    "Creating an empty JSON config…"
                                                :   "Fetching the latest saved version…"}
                                            </span>
                                        </div>
                                    : detailError ?
                                        <div className="detail-error">
                                            <CircleAlert size={21} />
                                            <strong>Couldn’t load this configuration</strong>
                                            <span>{detailError}</span>
                                            <button
                                                className="retry-button"
                                                onClick={() => void fetchSource(active, true)}
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    : activeResult?.status === "not_found" ?
                                        <div className="missing-config">
                                            <div className="missing-art">
                                                <Braces size={25} />
                                            </div>
                                            <strong>This source has no configuration yet</strong>
                                            <span>
                                                Initialize it to create an empty JSON config, then edit it here.
                                            </span>
                                            {actionError && <p className="action-error">{actionError}</p>}
                                            <button
                                                className="init-button"
                                                onClick={() => void initializeConfig(active)}
                                                disabled={actionLoading}
                                            >
                                                <Plus size={16} />
                                                {actionLoading ? "Initializing…" : "Initialize config"}
                                            </button>
                                        </div>
                                    : isEditing ?
                                        <div className="editor-wrap">
                                            <div className="editor-toolbar">
                                                <span>JSON editor</span>
                                                <button className="format-button" onClick={() => {
                                                    try {
                                                        setDraft(JSON.stringify(JSON.parse(draft), null, 4));
                                                        setEditorError("");
                                                    } catch {
                                                        setEditorError("Fix the JSON syntax before formatting.");
                                                    }
                                                }}>
                                                    <AlignLeft size={13} /> Format JSON
                                                </button>
                                            </div>
                                            <div className="editor-surface">
                                                <textarea
                                                    className="json-editor"
                                                    wrap="off"
                                                    spellCheck={false}
                                                    aria-label="Edit JSON configuration"
                                                    value={draft}
                                                    onChange={(event) => {
                                                        setDraft(event.target.value);
                                                        setEditorError("");
                                                    }}
                                                />
                                            </div>
                                            {editorError && (
                                                <div className="editor-error">
                                                    <CircleAlert size={15} />
                                                    {editorError}
                                                </div>
                                            )}
                                        </div>
                                    : currentConfig !== undefined ?
                                        <pre>
                                            <code>{highlightJson(serializedConfig)}</code>
                                        </pre>
                                    :   <div className="detail-loading">
                                            <span className="spinner" />
                                            <strong>Preparing viewer…</strong>
                                        </div>
                                    }
                                </div>
                                <footer className="viewer-footer">
                                    <span>
                                        <span
                                            className={
                                                activeResult?.status === "not_found" ? "missing-dot" : "live-dot"
                                            }
                                        />
                                        {isEditing ?
                                            isDirty ?
                                                "Unsaved changes"
                                            :   "No changes"
                                        : activeResult?.status === "not_found" ?
                                            "Waiting for initialization"
                                        :   "Read-only view"}
                                    </span>
                                    <span>
                                        {isEditing ?
                                            `${draft.split("\n").length} lines`
                                        : currentConfig === undefined ?
                                            "—"
                                        :   `${serializedConfig.split("\n").length} lines`}
                                    </span>
                                </footer>
                            </>
                        }
                    </section>
                </section>
            </main>
        </div>
    );
}
