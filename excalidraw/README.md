# Excalidraw on cloud.gov

[Excalidraw](https://github.com/excalidraw/excalidraw) is a virtual whiteboard. This folder deploys the upstream image `excalidraw/excalidraw`, pinned by digest, to cloud.gov.

**Status:** Working (see the status table in the [root README](../README.md)). Put it behind an auth proxy (oauth2-proxy) per the root README.

## Deploy

```bash
cf target -o <your-org> -s <space>
cd excalidraw
cf push -f manifest.yml
```

## Configuration

Only `NODE_ENV=production` is set. The app is stateless and has no database or volumes. The manifest sets no route; the app gets the default route for your space unless you map one.

## Known issues

- The upstream project publishes only a `latest` tag plus per-commit `sha-` tags from 2021, so the manifest pins the `latest` image digest (resolved 2026-10-28, pushed 2026-05-06). Update the digest deliberately when you want a newer build.
- The image is not built or scanned by this repository's workflows.
- Excalidraw's collaboration feature needs a separate room server, which this deployment does not include.
