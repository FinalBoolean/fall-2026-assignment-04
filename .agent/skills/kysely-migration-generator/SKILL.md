---
name: kysely-migration-generator
description: Translate Mermaid entity relationship diagrams into PostgreSQL Kysely TypeScript migrations with generated primary keys, cascading foreign keys, cardinality constraints, and reversible dependency ordering.
---

# Kysely Migration Generator

Read `docs/architecture/schema.mmd`, the existing migrations, and `src/db/migrator.ts` before generating a migration. Use the Mermaid entities, attributes, key markers, and relationship endpoints as the schema specification. Compare against the existing schema so an incremental migration changes existing tables instead of recreating them. Resolve ambiguous foreign-key targets or conflicting definitions before writing the affected constraints.

## Translation rules

- **Entities to tables:** Convert entity names to snake_case table names: `USERS` becomes `users`, `USER_PROFILES` becomes `user_profiles`, and `OrderItems` becomes `order_items`. Convert column names to snake_case as well. Preserve the entity's singular or plural form; do not invent pluralization. Detect naming collisions after normalization.
- **Types and columns:** Use PostgreSQL types supported by Kysely, such as `integer`, `bigint`, `uuid`, `text`, `boolean`, and `timestamp`. Preserve explicit lengths, defaults, and nullability from the schema. Foreign-key types must match their referenced columns. Do not infer a database type from a relationship label alone.
- **Primary keys (`PK`):** Generate integer primary keys with `.addColumn('id', 'serial', (col) => col.primaryKey())`, using `bigserial` for bigint IDs. Generate UUID primary keys with `.addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))`. Import `sql` when needed and confirm that the UUID generator is available in the target PostgreSQL environment. Preserve the declared key column names. For unsupported primary-key types, clarify the generation strategy instead of silently creating a non-generating key. Preserve explicitly declared composite keys with a table primary-key constraint rather than marking each column as a separate primary key.
- **Foreign keys (`FK`):** Resolve each attribute to its referenced table and key, then use `.references('users.id').onDelete('cascade')` on its column builder. Apply this to every foreign key. Do not make a foreign key auto-generating merely because it references a generated primary key. A column marked both `PK` and `FK` derives its value from the referenced key and must not generate an independent value. For explicitly composite foreign keys, use `.addForeignKeyConstraint(...).onDelete('cascade')` with matching column lists.
- **One-to-many (`||--o{`):** For `USERS ||--o{ POSTS`, put the foreign key on `posts`, referencing the primary key of `users`. Do not add a unique constraint to that foreign key: multiple posts may reference one user. Because `||` means each post has exactly one user, mark its foreign key `.notNull()`. The `o{` endpoint permits a user to have zero posts; it does not make the post's user foreign key nullable.
- **One-to-one (`||--o|`):** For `USERS ||--o| PROFILES`, put the foreign key on `profiles`, referencing `users`, and apply `.notNull().unique()` together with `.references(...).onDelete('cascade')`. Each profile belongs to exactly one user, while the unique constraint allows at most one profile per user. A user may have no profile, represented by the absence of a profile row. If the referenced endpoint permits zero (for example `|o` rather than `||`), allow a nullable foreign key. Read endpoint cardinalities even when entities are written in the opposite order. Preserve explicit `UK` markers as unique constraints too.

## File and structure guardrails

Write the migration to `src/db/migrations/<timestamp>_<migration_name>.ts`. Use a sortable UTC timestamp such as `YYYYMMDDHHmmssSSS` and a descriptive snake_case migration name. Choose an unused filename that sorts after existing migrations; do not overwrite an existing migration.

Import `Kysely` from `kysely` and export both functions with these signatures:

```ts
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Await each schema operation, ending each builder with .execute().
}

export async function down(db: Kysely<any>): Promise<void> {
  // Undo this migration's operations in reverse dependency order.
}
```

Create referenced tables before dependent tables in `up`. For a foreign-key cycle, create the tables first and add the cyclic foreign-key constraints afterward; remove those constraints before dropping tables in `down`.

The `down` function must drop newly created tables in reverse dependency order, with child tables before their parents. For example, create `users` before `posts` and `profiles`, then drop `profiles` and `posts` before `users`. Undo added constraints and changes to pre-existing tables instead of dropping those tables. Do not use cascading table drops to conceal incorrect rollback ordering.

Check that all entities, attributes, keys, and cardinalities are represented and run `npm run build` to validate the generated TypeScript. Do not execute migrations against a database unless the user requests that action.
