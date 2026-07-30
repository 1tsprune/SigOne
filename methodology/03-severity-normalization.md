# Methodology: Severity Normalization

Different SIEMs express severity differently: Wazuh uses integers (0-15+), Sentinel uses strings ("High", "Medium"), and others might use scores (0-100).

SigOne normalizes all incoming severities to a standard enum: `critical`, `high`, `medium`, `low`, or `info`.

This is handled by the `severity_scale` block within a source's `mapping.json`:

```json
"severity_scale": {
  "type": "integer_threshold",
  "critical": 12,
  "high": 8,
  "medium": 4
}
```

The ingestion workflow reads this block. If `type` is integer-based (like Wazuh), it maps the extracted severity integer against the defined thresholds. If `type` is string-based, it relies on direct mapping (e.g., `"high": ["High", "Severe"]`). 

**Important:** We do not enforce a one-size-fits-all severity mapping for a vendor because many organizations heavily customize their rulesets. The default mappings provided in the `sources/` directory assume vanilla configurations. Adjust them in your deployment's `source_registry` if necessary.
