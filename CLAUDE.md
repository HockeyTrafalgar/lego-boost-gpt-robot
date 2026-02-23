# Project Memory

## User Info
- Name: Timur Valishev

## Running Docker in This Environment

This environment runs Linux kernel **4.4.0**, which has several limitations that prevent Docker from working with its defaults. Follow these steps exactly.

### 1. Start the Docker daemon

The daemon must be started manually with two flags:

```bash
dockerd --iptables=false --storage-driver=vfs --bridge=none &>/tmp/dockerd.log &
sleep 6
docker info  # verify it's up
```

- `--iptables=false` — kernel lacks nftables support, iptables rules will fail
- `--storage-driver=vfs` — the filesystem (9p) does not support overlayfs
- `--bridge=none` — disables bridge networking, which fails on this kernel due to a stale `docker0` interface and missing iptables

Wait ~5-6 seconds after starting before issuing docker commands.

### 2. Run containers with host networking

**Always use `--network host`**. Bridge networking (`--network bridge`, the default) does not work in this environment. `--network none` works but makes the container unreachable from outside.

```bash
docker run -d --name my-container --network host my-image
```

With host networking the container shares the host's network stack directly — no port mapping syntax (`-p`) is needed or supported. The app inside the container binds to a port and it is immediately accessible on `localhost:<port>` and the host's external IP.

### 3. If the daemon fails to start with "existing interface docker0 is not a bridge"

A previous daemon run left a stale `docker0` interface. Kill any running dockerd and retry — the `--bridge=none` flag prevents this on subsequent runs:

```bash
kill $(pgrep dockerd) 2>/dev/null
sleep 2
dockerd --iptables=false --storage-driver=vfs --bridge=none &>/tmp/dockerd.log &
```
