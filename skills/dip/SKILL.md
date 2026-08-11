---
name: dip
description: Run Docker-based development commands using dip, a CLI tool for interacting with Docker Compose. Use when starting services, running commands, or managing containers in dip-based projects.
---

# Dip

Dip is a CLI tool for interacting with Docker Compose, providing convenient shortcuts for development workflows. Commands run inside Docker containers.

## Starting Services

```bash
dip up -d          # Start all services in the background (detached)
dip down           # Stop all services
dip stop           # Stop without removing containers
```

Always use `-d` when starting services so they run in the background.

## Running Commands

Available commands are defined in the project's `dip.yml` file. Read it to discover what's available.

```bash
dip <command>              # Run a dip command
dip sh                     # Open shell in container
```

### Environment Variables

Pass environment variables **after `dip`** and **before the command** to inject them into the container:

```bash
dip RAILS_ENV=test rails db:create
dip NODE_ENV=production yarn build
```

## Restarting Individual Services

```bash
dip compose restart <service>    # Restart a specific service
```

## Viewing Logs

```bash
docker logs <container-name> --tail 20
```

## Gotchas

### Port Conflicts

If `dip up` fails with "port is already allocated", other Docker containers from different projects are occupying the required ports. Run `dipstop` to shut down all running Docker Compose projects, then retry.

`dipstop` is defined in Ashley's `~/.bashrc` as an interactive Bash function, so agent/tool shells will not find it directly. When the agent needs to run it, use an interactive Bash shell:

```bash
bash -ic 'dipstop'
dip up -d
```

If the user is running it in their own interactive terminal, plain `dipstop` is fine. If `dipstop` is not available, inspect conflicts with `docker ps --format 'table {{.Names}}\t{{.Ports}}'` and stop only the containers occupying the required ports.

### MinIO and Tailscale URLs

For apps that run a local MinIO server and will be tested through the machine's Tailscale hostname, configure MinIO before starting the app. Presigned S3/ActiveStorage URLs are generated from the app's MinIO endpoint; if the endpoint stays as `localhost`, `127.0.0.1`, `lvh.me`, or a Docker-only hostname, links can work inside containers but fail in the user's browser over Tailscale.

Before `dip up -d`, add/update the project-specific `docker-compose.$USER.yml` override so:

- app services that generate or upload files use the Tailscale MinIO endpoint, for example `MINIO_ENDPOINT: "http://<tailscale-hostname>:9000"`
- background job services also get the same endpoint, if they generate uploads/PDFs
- the MinIO service advertises browser-reachable URLs, for example:
  - `MINIO_SERVER_URL: "http://<tailscale-hostname>:9000"`
  - `MINIO_BROWSER_REDIRECT_URL: "http://<tailscale-hostname>:9090"`
- MinIO API/console ports are published on the host and match those URLs, commonly `9000:9000` and `9090:9090`

If another project already has MinIO bound to 9000/9090, either stop that project's MinIO container or choose alternate host ports and make the Tailscale endpoint/redirect URL use those same ports. After changing the override, run `dip up -d` so Docker recreates the affected app/worker/MinIO containers.

Example override shape:

```yaml
services:
  rails:
    environment:
      MINIO_ENDPOINT: "http://garibaldi.tail0349c.ts.net:9000"
  sidekiq:
    environment:
      MINIO_ENDPOINT: "http://garibaldi.tail0349c.ts.net:9000"
  minio:
    environment:
      MINIO_SERVER_URL: "http://garibaldi.tail0349c.ts.net:9000"
      MINIO_BROWSER_REDIRECT_URL: "http://garibaldi.tail0349c.ts.net:9090"
```

Verify by uploading a small temporary object through the app's storage service and opening its generated presigned URL with `agent-browser`; the URL host should be the Tailscale hostname and the body should load in the browser.

### Networking Issues

If services can't connect to each other after stopping and starting containers, the containers may have ended up on different Docker networks. A full `dip down && dip up -d` (not just restart) will recreate the network cleanly.

### Port Forwarding (StandardVision & MerchTable)

StandardVision uses subdomains and MerchTable uses subdomain-based routing, which don't work with the Tailscale URL. After running `dip up -d`, port 3000 needs to be forwarded from the user's local machine to the dev server (Garibaldi).

**This is NOT a command the agent runs.** It must be run by the user in their own local terminal. After running `dip up -d`, always remind the user and paste the exact command below so they can copy it:

```bash
ssh -L 3000:localhost:3000 garibaldi -N -o ConnectTimeout=10
```

Then they can access the app at `http://localhost:3000` instead of the Tailscale URL.

### Failed Migration Rollbacks

If a migration rollback fails (e.g. `dip rails db:rollback` errors out), **NEVER** attempt to fix it by dumping and recreating the database (`db:drop`, `db:create`, `db:schema:load`, `db:reset`, etc.). The development database contains data that cannot be recreated from seeds alone. Instead, stop what you are doing and notify the user so you can find a resolution together.

### Missing Dependencies

If a service fails to start due to missing dependencies, install them via dip and restart:

```bash
dip <install-command>
dip compose restart <service>
```
