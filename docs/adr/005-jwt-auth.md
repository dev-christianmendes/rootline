# ADR 005: JWT Stateless Authentication

## Status

Accepted

## Context

Rootline needs authentication for its API. Options:

1. **Session/Cookie** - Traditional server-side sessions
2. **JWT (Stateless)** - Self-contained tokens, no server-side storage
3. **OAuth2/OIDC** - External identity provider (Keycloak, Auth0, Google)
4. **API Keys** - Simple tokens for service-to-service

Requirements:

- Simple to implement and maintain
- Works with SPA (Next.js) + API architecture
- Stateless for horizontal scaling
- Secure defaults (HttpOnly cookies not feasible for SPA + separate API domain)
- Extensible for future OAuth2 integration

## Decision

Use **JWT (HS256)** with short-lived access tokens:

```python
# Token creation
access_token = jwt.encode(
    {"sub": username, "exp": datetime.utcnow() + timedelta(days=7)},
    settings.secret_key,
    algorithm="HS256"
)

# Protected routes
@router.post("/incidents")
def create_incident(
    payload: IncidentCreate,
    current_user: User = Depends(get_current_active_user)
):
    ...
```

**Login flow**:

1. `POST /api/v1/auth/login` with `username` + `password`
2. Returns `access_token` (Bearer)
3. Client stores in memory (React state) - not localStorage
4. Requests include `Authorization: Bearer <token>`

**Password hashing**: bcrypt via `passlib`

## Consequences

### Positive

- **Stateless** - No session store, scales horizontally
- **Simple** - No Redis/session DB required
- **Mobile-friendly** - Same token works for mobile apps
- **Extensible** - Can add refresh tokens, scopes, or migrate to OAuth2 later
- **Standard** - Widely supported, well-understood

### Negative

- **No immediate revocation** - Token valid until expiry (mitigated by short expiry)
- **Token size** - Includes claims in every request (~200-500 bytes)
- **Secret management** - `ROOTLINE_SECRET_KEY` must be rotated periodically
- **No built-in refresh** - Current impl uses 7-day expiry (add refresh tokens later if needed)

### Neutral

- HS256 symmetric (simpler than RS256 asymmetric)
- 7-day default expiry (configurable via `ROOTLINE_ACCESS_TOKEN_EXPIRE_MINUTES`)

## Alternatives Considered

### Session Cookies + CSRF

- Rejected: Requires same-domain or complex CORS/CSRF setup with separate API domain

### OAuth2/OIDC (Keycloak/Auth0)

- Rejected: Overkill for MVP; adds infrastructure complexity; can be added later

### API Keys

- Rejected: Less secure for user authentication; better for service-to-service

### RS256 (Asymmetric)

- Rejected: Key management complexity not justified for internal API

## References

- [RFC 7519 JWT](https://tools.ietf.org/html/rfc7519)
- [OWASP JWT Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)
- [passlib bcrypt](https://passlib.readthedocs.io/en/stable/lib/passlib.hash.bcrypt.html)
