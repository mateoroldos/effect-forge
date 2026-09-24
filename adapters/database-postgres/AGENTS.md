# PostgreSQL adapter

Read [the database workflow](README.md) before changing tables, generated auth
schema, SQL implementations, or migrations.

- Implement core-owned ports with domain values and port-owned errors. Keep driver errors as diagnostic causes; do not expose them through public responses.
- Scope resource reads and writes by organization ID, including updates by resource ID.
- Decode returned rows before they enter core. Test constraints, scoping, and decoding through the port with migrated PGlite.
- Keep provider schema generation distinct from application schema ownership. Commit generated SQL and snapshots with schema changes; never edit an already-applied migration.
- Export dependency-open adapter Layers. Production database resources are supplied by composition roots.

Use the existing test-only exports for shared migrated fixtures; keep them out of
production composition.
