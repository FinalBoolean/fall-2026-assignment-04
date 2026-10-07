import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // The initial migration owns users; this migration only references it.
  await db.schema
    .createTable('borrowers')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().unique().references('users.id').onDelete('cascade')
    )
    .addColumn('membership_number', 'text', (col) => col.notNull().unique())
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .execute();

  await db.schema
    .createTable('books')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('barcode', 'text', (col) => col.notNull().unique())
    .addColumn('isbn', 'text')
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('published_year', 'integer')
    .addColumn('withdrawn_at', 'timestamptz')
    .execute();

  await db.schema
    .createTable('authors')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('full_name', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('genres')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull().unique())
    .execute();

  await db.schema
    .createTable('book_authors')
    .addColumn('book_id', 'integer', (col) =>
      col.notNull().references('books.id').onDelete('cascade')
    )
    .addColumn('author_id', 'integer', (col) =>
      col.notNull().references('authors.id').onDelete('cascade')
    )
    .addPrimaryKeyConstraint('book_authors_pkey', ['book_id', 'author_id'])
    .execute();

  await db.schema
    .createTable('book_genres')
    .addColumn('book_id', 'integer', (col) =>
      col.notNull().references('books.id').onDelete('cascade')
    )
    .addColumn('genre_id', 'integer', (col) =>
      col.notNull().references('genres.id').onDelete('cascade')
    )
    .addPrimaryKeyConstraint('book_genres_pkey', ['book_id', 'genre_id'])
    .execute();

  await db.schema
    .createTable('loans')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('borrower_id', 'integer', (col) =>
      col.notNull().references('borrowers.id').onDelete('cascade')
    )
    .addColumn('book_id', 'integer', (col) =>
      col.notNull().references('books.id').onDelete('cascade')
    )
    .addColumn('checked_out_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .addColumn('due_at', 'timestamptz', (col) => col.notNull())
    .addColumn('returned_at', 'timestamptz')
    .addCheckConstraint('loans_due_after_checkout', sql`due_at > checked_out_at`)
    .addCheckConstraint(
      'loans_return_after_checkout',
      sql`returned_at IS NULL OR returned_at >= checked_out_at`
    )
    .execute();

  await db.schema
    .createIndex('loans_one_active_per_book')
    .on('loans')
    .column('book_id')
    .unique()
    .where(sql<boolean>`returned_at IS NULL`)
    .execute();

  // Checkout must transactionally verify borrower.is_active and book.withdrawn_at.
  // Normal operations archive members/copies rather than deleting loan history.
}

export async function down(db: Kysely<any>): Promise<void> {
  // Dropping loans also removes its partial index and date constraints.
  await db.schema.dropTable('loans').execute();
  await db.schema.dropTable('book_genres').execute();
  await db.schema.dropTable('book_authors').execute();
  await db.schema.dropTable('genres').execute();
  await db.schema.dropTable('authors').execute();
  await db.schema.dropTable('books').execute();
  await db.schema.dropTable('borrowers').execute();
}
