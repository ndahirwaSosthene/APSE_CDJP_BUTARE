"""Versioned schema migrations for the APSE SQLite database.

How to change the schema
------------------------
1. Never edit a migration that has already shipped.
2. Add a new function `mNNN_short_name(db)` and append it to MIGRATIONS with the next number.
3. Use the helpers below (`add_column`, `CREATE ... IF NOT EXISTS`) so a migration is safe to
   re-run on a database that was partially migrated by hand.

What happens at startup
-----------------------
- `schema_migrations` records every applied version, its name and when it ran.
- If anything is pending on an existing database, a full copy is written to
  `<data>/backups/apse-pre-v<N>-<timestamp>.sqlite` first (newest 10 are kept).
- Each migration runs in its own transaction: it either fully applies or not at all.

The same numbered list runs on a parish laptop and on the central server, and the sync
protocol refuses to exchange data between nodes whose schema versions differ.
"""
from datetime import datetime, timezone
from pathlib import Path
import sqlite3


def add_column(db, table, column, ddl):
    cols = {r[1] for r in db.execute(f'PRAGMA table_info({table})')}
    if column not in cols:
        db.execute(f'ALTER TABLE {table} ADD COLUMN {column} {ddl}')


def m001_baseline(db):
    """Tables that existed before versioning (records, history, audit, v1_tasks, v1_logs, ...)
    are created by Engine.__init__ / init_v1. This marks that baseline."""


def m002_institutional_workflow(db):
    """Plan horizon (F03/F04/F43/F05), CPJP Volet and preparation mode, review indexes."""
    add_column(db, 'v1_tasks', 'plan_horizon', "TEXT NOT NULL DEFAULT 'ANNUAL'")
    add_column(db, 'v1_logs', 'volet', "TEXT NOT NULL DEFAULT ''")
    add_column(db, 'v1_logs', 'prep_mode', "TEXT NOT NULL DEFAULT ''")
    db.execute('CREATE INDEX IF NOT EXISTS v1_logs_stage ON v1_logs(stage, parish_code)')
    db.execute('CREATE INDEX IF NOT EXISTS v1_logs_date ON v1_logs(event_date)')
    db.execute('CREATE INDEX IF NOT EXISTS v1_tasks_filter ON v1_tasks(parish_code, axis, due_date)')


def m003_sync_outbox(db):
    """Local -> central synchronisation: change feed (outbox), node state and history."""
    add_column(db, 'v1_tasks', 'origin_node', "TEXT NOT NULL DEFAULT ''")
    add_column(db, 'v1_logs', 'origin_node', "TEXT NOT NULL DEFAULT ''")
    # Individual statements (not executescript) so everything stays inside the migration transaction.
    db.execute('''CREATE TABLE IF NOT EXISTS sync_outbox(
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        origin_node TEXT NOT NULL,
        payload BLOB NOT NULL,
        created TEXT NOT NULL,
        pushed_at TEXT)''')
    db.execute('CREATE INDEX IF NOT EXISTS sync_outbox_pending ON sync_outbox(origin_node, pushed_at)')
    db.execute('CREATE TABLE IF NOT EXISTS sync_state(key TEXT PRIMARY KEY, value TEXT NOT NULL)')
    db.execute('''CREATE TABLE IF NOT EXISTS sync_history(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT NOT NULL,
        direction TEXT NOT NULL,
        items INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '')''')


MIGRATIONS = [
    (1, 'baseline', m001_baseline),
    (2, 'institutional_workflow', m002_institutional_workflow),
    (3, 'sync_outbox', m003_sync_outbox),
]
LATEST_VERSION = MIGRATIONS[-1][0]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _ensure_table(db):
    db.execute('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)')


def applied_versions(db):
    _ensure_table(db)
    return {r[0] for r in db.execute('SELECT version FROM schema_migrations')}


def current_version(db):
    v = applied_versions(db)
    return max(v) if v else 0


def _has_user_data(db):
    try:
        return db.execute('SELECT COUNT(*) FROM v1_tasks').fetchone()[0] > 0
    except sqlite3.Error:
        return False


def _backup(db, db_path, target_version, keep=10):
    folder = Path(db_path).resolve().parent / 'backups'
    folder.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    dest = folder / f'apse-pre-v{target_version}-{stamp}.sqlite'
    out = sqlite3.connect(str(dest))
    try:
        db.backup(out)
    finally:
        out.close()
    for old in sorted(folder.glob('apse-pre-v*.sqlite'))[:-keep]:
        try:
            old.unlink()
        except OSError:
            pass
    return str(dest)


def run(db, db_path=':memory:'):
    """Apply pending migrations. Returns a small report for logging / the status endpoint."""
    done = applied_versions(db)
    pending = [m for m in MIGRATIONS if m[0] not in done]
    report = {'applied': [], 'backup': None, 'version': max(done) if done else 0}
    if not pending:
        return report
    if db_path and db_path != ':memory:' and Path(db_path).exists() and (done or _has_user_data(db)):
        report['backup'] = _backup(db, db_path, pending[-1][0])
    for version, name, fn in pending:
        db.execute('BEGIN IMMEDIATE')
        try:
            fn(db)
            db.execute('INSERT INTO schema_migrations(version, name, applied_at) VALUES(?,?,?)', (version, name, _now()))
            db.execute('COMMIT')
        except Exception:
            db.execute('ROLLBACK')
            raise
        report['applied'].append(f'{version:03d}_{name}')
        report['version'] = version
    return report


def status(db):
    _ensure_table(db)
    rows = {r[0]: (r[1], r[2]) for r in db.execute('SELECT version, name, applied_at FROM schema_migrations')}
    return {
        'current_version': max(rows) if rows else 0,
        'latest_version': LATEST_VERSION,
        'migrations': [
            {'version': v, 'name': n, 'applied_at': rows.get(v, (None, None))[1], 'applied': v in rows}
            for v, n, _ in MIGRATIONS
        ],
    }
