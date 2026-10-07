---
name: erd-generator
description: Create or update the repository's Mermaid entity relationship diagram and validate it by compiling an SVG with the installed Mermaid CLI.
---

# ERD Generator

Use the database schema and migrations as the source of truth for entities, attributes, primary and foreign keys, and relationship cardinalities. Write the diagram in Mermaid `erDiagram` syntax to `docs/architecture/schema.mmd`.

From the repository root, run:

```sh
node .agent/skills/erd-generator/scripts/render_erd.js
```

The renderer uses the pre-installed `@mermaid-js/mermaid-cli` via `npx --no-install mmdc` and writes `docs/architecture/erd.svg`. It creates the output directory if needed.

- Exit code `0` and `SUCCESS` mean SVG compilation succeeded.
- Exit code `1` and `SYNTAX_ERROR:` followed by the stderr trace mean compilation failed. Inspect the trace, correct Mermaid syntax when applicable, and rerun. If the trace identifies a missing dependency or browser problem, report that limitation rather than treating it as a diagram syntax defect.

After successful compilation, inspect the SVG for readable labels and accurate relationships. Compilation validates Mermaid syntax; confirm schema accuracy against the source separately.
