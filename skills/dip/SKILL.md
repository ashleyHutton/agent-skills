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

If `dip up` fails with "port is already allocated", other Docker containers from different projects are occupying the required ports. Run `dipstop` to shut down all running Docker Compose projects, then retry:

```bash
dipstop
dip up -d
```

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
