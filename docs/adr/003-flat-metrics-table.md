# ADR 003: SQLAlchemy Flat metric_points Table

## Status

Accepted

## Context

Rootline stores time-series metrics (latency, error rate, CPU, memory, request rate) for multiple services. We need efficient range queries and aggregations for dashboard charts.

Two main approaches for time-series storage in PostgreSQL:

1. **JSON array per series** - Store all points as `JSONB` in one row per service+metric
2. **Flat table** - One row per data point with `(service_id, metric, timestamp, value)`

## Decision

Use a flat `metric_points` table with one row per data point:

```python
class MetricPoint(Base):
    __tablename__ = "metric_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_id = Column(String, ForeignKey("services.id"), index=True)
    metric = Column(String(32))  # latency_ms, error_rate, etc.
    series_position = Column(Integer, default=0)  # Curated order
    unit = Column(String(16), default="")
    timestamp = Column(DateTime(timezone=True))
    value = Column(Float)

    # Composite indexes for common queries
    __table_args__ = (
        Index("ix_metric_points_series", "service_id", "series_position", "timestamp"),
        Index("ix_metric_points_metric", "service_id", "metric", "timestamp"),
    )
```

API regroups flat rows into `MetricSeries` on the way out.

## Consequences

### Positive

- **Efficient range scans** - `WHERE service_id = ? AND timestamp BETWEEN ? AND ?` uses composite index
- **SQL aggregations** - `AVG()`, `MAX()`, `percentile_cont()` work natively
- **Flexible filtering** - Easy to add `WHERE metric = ?` or time range filters
- **Scalability** - Partitioning by time range possible later
- **Schema clarity** - Each column has explicit type, self-documenting
- **Migration friendly** - Easy to add columns (e.g., `labels JSONB`)

### Negative

- **Storage overhead** - More rows than JSON array (mitigated by compression)
- **Regrouping overhead** - API must regroup flat rows into series (negligible for <10k points)
- **Row count** - High cardinality (service × metric × time) but manageable

### Neutral

- Requires composite indexes for query performance
- Points inserted in batches for efficiency

## Alternatives Considered

### JSONB Array per Series

```python
class MetricSeries(Base):
    series_data = Column(JSONB)  # [{"timestamp": "...", "value": 1.2}, ...]
```

- Rejected: Range queries require `jsonb_array_elements` + lateral join, slow for large arrays
- No native SQL aggregations without unnesting
- Schema less clear (array of objects with varying keys)

### TimescaleDB / InfluxDB

- Rejected: Additional infrastructure dependency; PostgreSQL native sufficient for current scale

### Separate Table per Metric

```python
class LatencyMetric(Base): ...
class ErrorRateMetric(Base): ...
```

- Rejected: Schema proliferation, hard to add new metrics dynamically

## References

- [PostgreSQL JSONB vs relational](https://www.postgresql.org/docs/current/datatype-json.html)
- [TimescaleDB vs native PostgreSQL](https://www.timescale.com/blog/postgresql-vs-timescaledb/)
