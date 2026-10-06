# ADR 002: Next.js Proxy for API (Avoids CORS)

## Status

Accepted

## Context

The Rootline frontend (Next.js) needs to communicate with the FastAPI backend. In development, the frontend runs on `localhost:3000` and the API on `localhost:8000`. This creates a cross-origin request scenario.

Options for handling this:

1. **CORS headers on FastAPI** - Configure `CORSMiddleware` with allowed origins
2. **Next.js rewrites (proxy)** - Frontend calls same-origin `/api/v1/*`, Next.js proxies to FastAPI
3. **Same-domain deployment** - Deploy both behind a reverse proxy (nginx)

In development, option 1 requires maintaining CORS config. Option 2 keeps CORS out of the codebase entirely. Option 3 is production-only.

## Decision

Use Next.js rewrites to proxy `/api/v1/*` to the FastAPI backend:

```typescript
// next.config.ts
const apiOrigin = process.env.ROOTLINE_API_URL ?? "http://localhost:8000";

export default {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};
```

The browser always calls same-origin `/api/v1/*`. Next.js proxies server-side to the FastAPI origin.

## Consequences

### Positive

- **No CORS in codebase** - FastAPI doesn't need `CORSMiddleware` for development
- **Production-ready** - Works identically when deployed behind load balancer
- **Security** - No CORS misconfiguration risk
- **Simplicity** - Single origin for browser, no preflight requests
- **Environment flexibility** - Override with `ROOTLINE_API_URL` for different environments

### Negative

- **Extra hop** - Next.js adds minimal latency (~1-2ms) for proxy
- **Debugging** - Network tab shows Next.js as caller, not direct API
- **Next.js dependency** - Couples frontend to Next.js proxy feature

### Neutral

- Production deployment typically uses nginx/ALB for TLS termination anyway

## Alternatives Considered

### CORS on FastAPI

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- Rejected: Requires maintaining origin list, CORS misconfigurations are common security issues

### Vite/Next.js dev server proxy

- Similar to rewrites but less flexible for production parity

## References

- [Next.js rewrites documentation](https://nextjs.org/docs/app/api-reference/next-config-js/rewrites)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
