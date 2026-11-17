"""Local <-> central database synchronisation.

Supports two transport modes out of the box:
1. **HTTP/HTTPS Remote Server Mode**: When `remote_url` starts with `http://` or `https://`,
   `sync_run` pushes local `sync_outbox` changes to `POST {remote_url}/api/v1/sync/receive`
   and pulls remote changes from `GET {remote_url}/api/v1/sync/changes`.
2. **Managed Central Server DB Mode (Default Out-of-the-Box)**: When `remote_url` is empty or
   starts with `central://`, `sync_run` synchronises directly between the local SQLite database
   (`apse.sqlite`) and the central server SQLite database (`central_remote.sqlite`), verifying
   schema migration versions on both sides.

Every create / edit / review of a task or activity log writes a full row snapshot to
`sync_outbox` (the node's change feed).
"""
import hmac
import json
import secrets
import sqlite3
import urllib.error
import urllib.request
import uuid
from pathlib import Path

import migrations

SYNC_ENTITIES = ('v1_tasks', 'v1_logs')
BATCH_LIMIT = 500


class SyncEngine:
    # ------------------------------------------------------------------ state
    def init_sync(self):
        if not self._sync_get('node_id'):
            self._sync_set('node_id', 'node-' + uuid.uuid4().hex[:10])
        if not self._sync_get('remote_url'):
            self._sync_set('remote_url', 'central://cdjp-butare-central.sqlite')
        # Ensure existing tasks/logs are tracked in sync_outbox on first boot
        with self.lock:
            outbox_count = self.db.execute('SELECT COUNT(*) FROM sync_outbox').fetchone()[0]
            if outbox_count == 0:
                for entity in SYNC_ENTITIES:
                    for row in self.db.execute(f'SELECT id FROM {entity}'):
                        self._outbox(entity, row['id'])

    def _sync_get(self, key, default=None):
        row = self.db.execute('SELECT value FROM sync_state WHERE key=?', (key,)).fetchone()
        return row['value'] if row else default

    def _sync_set(self, key, value):
        self.db.execute(
            'INSERT INTO sync_state(key, value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
            (key, str(value)),
        )

    def _secret_get(self, key):
        raw = self._sync_get(key)
        if not raw:
            return ''
        try:
            return self.crypto.decrypt(raw.encode('ascii')).decode('utf-8')
        except Exception:
            return ''

    def _secret_set(self, key, value):
        self._sync_set(key, self.crypto.encrypt(value.encode('utf-8')).decode('ascii') if value else '')

    @property
    def node_id(self):
        return self._sync_get('node_id', 'node-unknown')

    def _history(self, direction, items, status, detail=''):
        from engine import NOW
        self.db.execute(
            'INSERT INTO sync_history(time, direction, items, status, detail) VALUES(?,?,?,?,?)',
            (NOW(), direction, int(items), status, str(detail)[:500]),
        )

    # ----------------------------------------------------------------- outbox
    def _row_snapshot(self, entity, row):
        d = {k: row[k] for k in row.keys() if k != 'body'}
        d['body'] = self.dec(row['body'])
        return d

    def _outbox(self, entity, entity_id, origin=None):
        """Record the current state of a row in the change feed."""
        from engine import NOW
        if entity not in SYNC_ENTITIES:
            return
        row = self.db.execute(f'SELECT * FROM {entity} WHERE id=?', (entity_id,)).fetchone()
        if not row:
            return
        origin = origin or self.node_id
        if not row['origin_node']:
            self.db.execute(f'UPDATE {entity} SET origin_node=? WHERE id=?', (origin, entity_id))
            row = self.db.execute(f'SELECT * FROM {entity} WHERE id=?', (entity_id,)).fetchone()
        self.db.execute(
            'INSERT INTO sync_outbox(entity, entity_id, origin_node, payload, created, pushed_at) VALUES(?,?,?,?,?,?)',
            (
                entity,
                entity_id,
                origin,
                self.enc(self._row_snapshot(entity, row)),
                NOW(),
                None if origin == self.node_id else NOW(),
            ),
        )

    def _apply_change(self, entity, data, origin, record_feed):
        """Insert or update a row received from another node. Returns 'applied' | 'conflict' | 'skipped'."""
        if entity not in SYNC_ENTITIES or not isinstance(data, dict) or not data.get('id'):
            return 'skipped'
        local_cols = [r[1] for r in self.db.execute(f'PRAGMA table_info({entity})')]
        existing = self.db.execute(f'SELECT updated FROM {entity} WHERE id=?', (data['id'],)).fetchone()
        if existing and str(existing['updated']) > str(data.get('updated', '')):
            return 'conflict'
        values = dict(data)
        values['body'] = self.enc(data.get('body') or {})
        values['origin_node'] = data.get('origin_node') or origin
        cols = [c for c in local_cols if c in values]
        self.db.execute(
            f'INSERT OR REPLACE INTO {entity}({",".join(cols)}) VALUES({",".join("?" for _ in cols)})',
            [values[c] for c in cols],
        )
        if record_feed:
            self._outbox(entity, data['id'], origin=values['origin_node'])
        return 'applied'

    # ------------------------------------------------------------ user facing
    def sync_status(self, user):
        with self.lock:
            pending = {
                e: self.db.execute(
                    'SELECT COUNT(DISTINCT entity_id) FROM sync_outbox WHERE entity=? AND origin_node=? AND pushed_at IS NULL',
                    (e, self.node_id),
                ).fetchone()[0]
                for e in SYNC_ENTITIES
            }
            synced = {
                e: self.db.execute(
                    'SELECT COUNT(DISTINCT entity_id) FROM sync_outbox WHERE entity=? AND pushed_at IS NOT NULL',
                    (e,),
                ).fetchone()[0]
                for e in SYNC_ENTITIES
            }
            history = [
                dict(r)
                for r in self.db.execute(
                    'SELECT time, direction, items, status, detail FROM sync_history ORDER BY id DESC LIMIT 8'
                )
            ]
            mig = migrations.status(self.db)
            return {
                'node_id': self.node_id,
                'schema_version': mig['current_version'],
                'latest_schema_version': mig['latest_version'],
                'migrations': mig['migrations'],
                'pending': {
                    'tasks': pending['v1_tasks'],
                    'logs': pending['v1_logs'],
                    'total': sum(pending.values()),
                },
                'synced': {
                    'tasks': synced['v1_tasks'],
                    'logs': synced['v1_logs'],
                    'total': sum(synced.values()),
                },
                'outbox': {
                    'pending': sum(pending.values()),
                    'synced': sum(synced.values()),
                    'pending_tasks': pending['v1_tasks'],
                    'pending_logs': pending['v1_logs'],
                },
                'remote_url': self._sync_get('remote_url', 'central://cdjp-butare-central.sqlite'),
                'remote_token_set': bool(self._secret_get('remote_token')),
                'is_central': bool(self._secret_get('accept_token')),
                'last_push': self._sync_get('last_push', ''),
                'last_pull': self._sync_get('last_pull', ''),
                'feed_size': self.db.execute('SELECT COUNT(*) FROM sync_outbox').fetchone()[0],
                'history': history,
            }

    def sync_configure(self, user, body):
        from engine import Fault
        from rbac import permissions
        user = self._resolve_v1_user(user)
        perms = permissions(self.roles(user))
        if not perms['can_configure_sync']:
            raise Fault(403, 'sync_config_mel_only', 'Only CDJP Diocesan MEL, Coordinator, or Director can change synchronisation settings.')
        result = {}
        with self.tx():
            if 'remote_url' in body:
                url = str(body.get('remote_url') or '').strip().rstrip('/')
                if url and not (url.startswith('http://') or url.startswith('https://') or url.startswith('central://')):
                    raise Fault(422, 'plain_error', 'The central server address must start with http://, https://, or central://')
                self._sync_set('remote_url', url or 'central://cdjp-butare-central.sqlite')
            if body.get('remote_token') is not None:
                self._secret_set('remote_token', str(body.get('remote_token') or '').strip())
            if body.get('make_central'):
                token = secrets.token_urlsafe(24)
                self._secret_set('accept_token', token)
                result['accept_token'] = token
            if body.get('stop_central'):
                self._secret_set('accept_token', '')
            self.audit(user, 'SYNC_CONFIGURE', self.node_id, {k: (v if 'token' not in k else '***') for k, v in body.items()})
        result.update(self.sync_status(user))
        return result

    def set_accept_token(self, token):
        with self.tx():
            self._secret_set('accept_token', token)

    def _http(self, method, url, token, payload=None, timeout=20):
        data = json.dumps(payload).encode('utf-8') if payload is not None else None
        req = urllib.request.Request(url, data=data, method=method, headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-APSE-Sync-Token': token,
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode('utf-8'))

    def _central_db_sync(self, node, schema, changes, since):
        """Sync against the managed central SQLite database file (when using central:// transport)."""
        from engine import Engine
        db_path = getattr(self, 'db_path', ':memory:')
        if db_path == ':memory:':
            central_path = ':memory:'
        else:
            central_path = str(Path(db_path).resolve().parent / 'central_remote.sqlite')
        central_engine = getattr(self, '_central_mirror_engine', None)
        if central_engine is None:
            key_str = getattr(self, '_raw_fernet_key', None)
            if not key_str:
                from cryptography.fernet import Fernet
                key_str = Fernet.generate_key()
            central_engine = Engine(central_path, key_str, self.audit_key, seed_demo=False)
            central_engine.set_accept_token('BUILTIN_CENTRAL_TOKEN')
            self._central_mirror_engine = central_engine
        pushed = central_engine.sync_receive('BUILTIN_CENTRAL_TOKEN', {
            'node': node,
            'schema_version': schema,
            'changes': changes,
        })
        pulled = central_engine.sync_changes('BUILTIN_CENTRAL_TOKEN', since=since, node=node, schema_version=schema)
        return pushed, pulled

    def sync_run(self, user):
        """Push local SQLite changes to the remote/central database, then pull any new records from it."""
        from engine import Fault, NOW
        user = self._resolve_v1_user(user)
        with self.lock:
            url = self._sync_get('remote_url', 'central://cdjp-butare-central.sqlite')
            token = self._secret_get('remote_token')
            rows = list(self.db.execute(
                'SELECT seq, entity, entity_id, payload FROM sync_outbox WHERE origin_node=? AND pushed_at IS NULL ORDER BY seq LIMIT ?',
                (self.node_id, BATCH_LIMIT * 4),
            ))
            latest = {}
            for r in rows:
                latest[(r['entity'], r['entity_id'])] = r
            changes = [{'entity': r['entity'], 'row': self.dec(r['payload'])} for r in sorted(latest.values(), key=lambda x: x['seq'])]
            seqs = [r['seq'] for r in rows]
            since = int(self._sync_get('pull_since', '0') or 0)
            schema = migrations.current_version(self.db)
            node = self.node_id

        if url.startswith('central://'):
            pushed, pulled = self._central_db_sync(node, schema, changes, since)
        else:
            if not url or not token:
                raise Fault(
                    409,
                    'sync_not_configured',
                    'No central server token is configured for HTTP sync. Enter the central server access token or use central:// mode.',
                )
            try:
                pushed = self._http('POST', url + '/api/v1/sync/receive', token, {'node': node, 'schema_version': schema, 'changes': changes})
                pulled = self._http('GET', url + f'/api/v1/sync/changes?since={since}&node={node}&schema_version={schema}', token)
            except urllib.error.HTTPError as e:
                try:
                    detail = json.loads(e.read().decode('utf-8')).get('details') or str(e)
                except Exception:
                    detail = str(e)
                with self.tx():
                    self._history('PUSH+PULL', len(changes), 'ERROR', detail)
                raise Fault(502, 'sync_remote_rejected', f'The central server refused the sync: {detail}')
            except Exception as e:
                with self.tx():
                    self._history('PUSH+PULL', len(changes), 'ERROR', f'unreachable: {e}')
                raise Fault(
                    502,
                    'sync_remote_unreachable',
                    'Could not reach the central server. Your work is safe on this device — try again when the connection is back.',
                )

        stamp = NOW()
        applied = conflicts = 0
        with self.tx():
            if seqs:
                self.db.execute(f'UPDATE sync_outbox SET pushed_at=? WHERE seq IN ({",".join("?" for _ in seqs)})', [stamp, *seqs])
            for ch in pulled.get('changes', []):
                res = self._apply_change(ch.get('entity'), ch.get('row'), ch.get('origin_node') or 'central', record_feed=False)
                applied += res == 'applied'
                conflicts += res == 'conflict'
            self._sync_set('pull_since', str(pulled.get('next_since', since)))
            self._sync_set('last_push', stamp)
            self._sync_set('last_pull', stamp)
            detail = f"Uploaded {len(changes)} local record(s) to Central DB ({pushed.get('applied', 0)} applied); downloaded {applied} record(s)" + (f', {conflicts} kept local (newer)' if conflicts else '')
            self._history('PUSH+PULL', len(changes) + applied, 'OK', detail)
            self.audit(user, 'SYNC_RUN', node, {'pushed': len(changes), 'pulled': applied, 'conflicts': conflicts})
        out = self.sync_status(user)
        out['last_run'] = {
            'pushed': len(changes),
            'pulled': applied,
            'conflicts': conflicts,
            'remote_conflicts': pushed.get('conflicts', 0),
        }
        return out

    # ---------------------------------------------------------- central side
    def _check_sync_token(self, token):
        from engine import Fault
        expected = self._secret_get('accept_token')
        if not expected:
            raise Fault(403, 'not_a_central_server', 'This APSE installation is not configured as a central server.')
        if not token or not hmac.compare_digest(str(token), expected):
            raise Fault(401, 'sync_token_invalid', 'Wrong central server access code.')

    def _check_schema(self, version):
        from engine import Fault
        mine = migrations.current_version(self.db)
        try:
            theirs = int(version)
        except (TypeError, ValueError):
            theirs = -1
        if theirs != mine:
            raise Fault(
                409,
                'schema_mismatch',
                f'Database versions differ (this server: v{mine}, your device: v{theirs}). Update APSE on the older side before syncing.',
            )

    def sync_receive(self, token, body):
        with self.tx():
            self._check_sync_token(token)
            self._check_schema(body.get('schema_version'))
            origin = str(body.get('node') or 'unknown')[:64]
            applied = conflicts = 0
            for ch in (body.get('changes') or [])[:BATCH_LIMIT * 4]:
                res = self._apply_change(ch.get('entity'), ch.get('row'), origin, record_feed=True)
                applied += res == 'applied'
                conflicts += res == 'conflict'
            self._history('RECEIVE', applied, 'OK', f'from {origin}: {applied} applied, {conflicts} conflicts')
            return {'ok': True, 'applied': applied, 'conflicts': conflicts, 'central_node': self.node_id}

    def sync_changes(self, token, since=0, node='', schema_version=None):
        with self.lock:
            self._check_sync_token(token)
            self._check_schema(schema_version)
            try:
                since = max(0, int(since))
            except (TypeError, ValueError):
                since = 0
            rows = list(self.db.execute(
                'SELECT seq, entity, origin_node, payload FROM sync_outbox WHERE seq>? AND origin_node<>? ORDER BY seq LIMIT ?',
                (since, str(node or ''), BATCH_LIMIT),
            ))
            last = self.db.execute('SELECT MAX(seq) FROM sync_outbox').fetchone()[0] or since
            next_since = rows[-1]['seq'] if len(rows) == BATCH_LIMIT else max(last, since)
            return {
                'changes': [{'entity': r['entity'], 'origin_node': r['origin_node'], 'row': self.dec(r['payload'])} for r in rows],
                'next_since': next_since,
                'central_node': self.node_id,
            }
