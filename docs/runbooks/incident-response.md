# Incident Response Runbook

## Severity Levels

| Severity | Response Time | Description                                        |
| -------- | ------------- | -------------------------------------------------- |
| **P1**   | 15 min        | Critical: Data loss, security breach, total outage |
| **P2**   | 1 hour        | High: Major feature down, significant user impact  |
| **P3**   | 4 hours       | Medium: Minor feature degraded, workaround exists  |
| **P4**   | 24 hours      | Low: Cosmetic, minor bug, no user impact           |

## Response Process

### 1. Detection

- Alert fires (Prometheus/Grafana/PagerDuty)
- User reports issue via Slack/support
- Automated anomaly detection triggers

### 2. Triage (First 15 min)

1. **Acknowledge** alert in PagerDuty/Slack
2. **Assess** severity using table above
3. **Create incident** in Rootline:
   ```bash
   # Via API
   curl -X POST https://api.rootline.com/api/v1/incidents \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "API returning 500s on /checkout",
       "description": "Payment API 500 spike after v2.8.1 deploy",
       "severity": "P1",
       "serviceId": "payment-api",
       "assignee": "your-name",
       "impact": "~12% of payments failing"
     }'
   ```

### 3. Investigation (Rootline)

1. Open incident in Rootline: `https://rootline.com/incidents/INC-XXXX`
2. Click **"Analyze"** to generate hypotheses
3. Review hypotheses ranked by confidence:
   - **Deployment correlation** - Recent deploy to affected service?
   - **Metric anomalies** - Error rate, latency spikes?
   - **Log patterns** - Error spikes, specific error messages?
   - **Trace analysis** - Failed spans, downstream failures?
   - **Dependency health** - Upstream/downstream services OK?
4. Click **"View investigation"** for evidence graph

### 4. Mitigation

Common mitigation actions:

- **Rollback deployment**: `kubectl rollout undo deployment/<service>`
- **Scale service**: `kubectl scale deployment <service> --replicas=N`
- **Circuit breaker**: Enable in API gateway
- **Feature flag**: Disable problematic feature
- **Traffic shift**: Route traffic to healthy version

### 5. Resolution

1. Identify root cause
2. Apply fix (code fix, config change, rollback)
3. Verify fix in staging → production
4. Update incident in Rootline:
   - Status: `RESOLVED`
   - Resolution: root cause, summary, mitigation steps
5. Close PagerDuty alert

### 6. Post-Incident (Within 48 hours)

1. **Blameless postmortem** - Document in Rootline investigation
2. **Action items** - Create tickets for:
   - Preventive measures
   - Detection improvements
   - Process improvements
3. **Share learnings** - Team meeting, update runbooks

## Common Scenarios

### API Returning 500s

1. Check `/health/ready` - DB connectivity?
2. Check recent deployments - `kubectl rollout history`
3. Check logs: `kubectl logs -f deployment/<service> | grep ERROR`
4. Check traces for failed spans
5. Rollback if recent deploy caused it

### High Latency / Timeouts

1. Check metrics: `/api/v1/services/<id>/metrics?metric=latency_ms`
2. Check downstream dependencies
3. Check DB query performance
4. Scale horizontally if CPU/memory high

### Database Issues

1. Check `/health/ready` - DB connectivity
2. Check connections: `SELECT count(*) FROM pg_stat_activity`
3. Check long-running queries
4. Check disk space: `df -h`

### WebSocket Issues

1. Check API logs for WS errors
2. Restart API pods: `kubectl rollout restart deployment/rootline-api`
3. Check nginx/load balancer WS config (timeout, buffer sizes)

## Communication

### Slack Channels

- `#incidents` - Active incident coordination
- `#oncall` - On-call rotation, escalations
- `#rootline-alerts` - Automated alerts

### Status Page

- Update status.rootline.com for customer-facing incidents
- Template: "We're investigating reports of [issue]. More updates shortly."

## Escalation

| Time    | Action                     |
| ------- | -------------------------- |
| 0 min   | On-call acknowledges       |
| 15 min  | P1: Page secondary on-call |
| 30 min  | P1: Page team lead         |
| 1 hour  | P2: Page secondary on-call |
| 2 hours | P2: Page team lead         |

## Runbook Maintenance

- Review quarterly
- Update after each major incident
- Add new scenarios as discovered
- Remove obsolete procedures
