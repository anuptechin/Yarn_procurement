# Production deploy — honocode (Ubuntu + Docker)

Topology on this host:
- **Edge:** `nginx_proxy` container owns `:80/:443`, configs in `/data/nginx-proxy/conf.d/`,
  certs in `/data/nginx-proxy/certs/`. Routes to app containers by name over the
  **`shared_proxy`** Docker network.
- **DB:** shared **`postgres_common`** (`postgres:16-alpine`) on `shared_proxy`, reachable
  from app containers as `postgres_common:5432`. Superuser: `postgres`.
- **YPP:** one app container `ypp` (built from this repo), `expose: 4043`, no host ports,
  joined to `shared_proxy`. Public at **https://yp.ddecor.com** (cert already present).

## 1. Place the code + .env
```bash
sudo mkdir -p /data/yp && sudo chown deploy:deploy /data/yp
# copy the repo to /data/yp (scp / git), then:
cd /data/yp
cp deploy/env.prod.sample .env
# edit .env — set JWT_SECRET, PGPASSWORD, SUPER_ADMIN_PASSWORD (all required)
#   JWT_SECRET:  openssl rand -base64 48
```
> **First boot only:** the restored snapshot (step 3) already contains
> `superadmin@ddecor.com` with the *laptop* password. To apply your real prod
> password, set `SUPER_ADMIN_RESET_PASSWORD=true` in `.env` for the first
> `docker compose up`, then set it back to `false` and `docker compose up -d` again.
`.env` is read at runtime via compose `env_file` — never baked into the image.

## 2. Provision the DB on postgres_common (once)
```bash
# create the role + database on the shared Postgres
docker exec -it postgres_common psql -U postgres -c \
  "CREATE ROLE yarn_app LOGIN PASSWORD 'PUT-SAME-AS-PGPASSWORD';"
docker exec -it postgres_common psql -U postgres -c \
  "CREATE DATABASE yarn_procurement OWNER yarn_app;"
```

## 3. Restore the complete dev snapshot (once)
Carries all data + the super admin + sequences. Dump is `--no-owner`, so objects
end up owned by the connecting role.
```bash
# from /data/yp (db/seed_dump.sql shipped with the repo)
docker exec -i postgres_common psql -U yarn_app -d yarn_procurement < db/seed_dump.sql
```
> Re-export a fresh snapshot from the laptop right before cutover if more data was
> entered since:
> `pg_dump -U yarn_app --no-owner --no-privileges --clean --if-exists yarn_procurement > db/seed_dump.sql`

## 4. Build & run
```bash
cd /data/yp
docker compose build
docker compose up -d
docker compose logs -f          # expect "Super Admin ..." then "API running"
# internal smoke test (no host port is published):
docker exec ypp wget -qO- http://127.0.0.1:4043/api/health
```

## 5. Wire up nginx (edge)
```bash
cp deploy/yp.conf /data/nginx-proxy/conf.d/yp.conf
docker exec nginx_proxy nginx -t
docker exec nginx_proxy nginx -s reload
```
Then browse **https://yp.ddecor.com**. The edge already rate-limits `/api/auth/`
(login) and `/api/portal/` (public vendor links).

## 6. Post-cutover hardening
- Disable the demo accounts carried over in the snapshot:
  ```sql
  -- run via: docker exec -it postgres_common psql -U yarn_app -d yarn_procurement
  UPDATE users SET active = 0
   WHERE email IN ('requisitioner@ddecor.com','procurement@ddecor.com',
                   'depthead@ddecor.com','admin@ddecor.com');
  ```
  (The env-driven `superadmin@ddecor.com` stays active.)
- Confirm `JWT_SECRET` and `SUPER_ADMIN_PASSWORD` are strong and unique.
- App-level follow-ups (separate batch): `trust proxy` + `secure` cookie, helmet.

## Updating later
```bash
cd /data/yp
git pull                                   # or re-copy
docker compose build && docker compose up -d
```

## Rollback
```bash
docker compose down                        # app only; DB on postgres_common is untouched
# redeploy a previous build, or restore a DB backup if schema/data changed
```
