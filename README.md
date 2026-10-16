# Config Studio

The config portal uses the config-service auth and portal endpoints. By default, Vite calls `http://localhost:8085`; set `VITE_API_BASE_URL` to point at another config-service deployment.

```sh
npm install
npm run dev
```

The root route checks the stored access token with `GET /api/config/user`, sends authenticated users to the workspace, and sends other users to sign-in. After login, the UI returns to the root route and repeats the check.

The workspace loads frontend and backend code lists, fetches a selected config on demand, and keeps fetched configs in a page cache. Selecting a cached source reuses its response; the refresh controls fetch the latest list or config again.
