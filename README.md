
# Collaboration Containers for Deployment on cloud.gov

>Ephemeral/Short-lived for prototyping only

Each folder contains a `manifest.yml` file to deploy an ephemeral container on cloud.gov. 

## Deployment Status

| App         | Status   | Last Failure (if any) | Directory Link |
|-------------|----------|----------------------|----------------|
| [Marimo](https://github.com/marimo-team/marimo)      | ✅ Working |                      | [marimo](./marimo/) |
| [openvscode-server](https://github.com/gitpod-io/openvscode-server)  | ✅ Working |                      | [openVScode](./openVScode/) |
| [Excalidraw](https://github.com/excalidraw/excalidraw)  | ✅ Working |                      | [excalidraw](./excalidraw/) |
| [HedgeDoc](https://github.com/hedgedoc/hedgedoc)    | ❌ Failing | DB connection issues, check `CMD_DB_URL` and database service binding. | [hedgedoc](./hedgedoc/) |
| [Outline](https://github.com/outline/outline)     | ❌ Failing | Missing/invalid secrets or AWS config in environment variables. | [outline](./outline/) |
| [Planka](https://github.com/plankanban/planka)      | ❌ Failing | Database not reachable or `DATABASE_URL` misconfigured. | [planka](./planka/) |
| [CryptPad](https://github.com/xwiki-labs/cryptpad)    | ❌ Failing | `config.js` not found at `/cryptpad/config/config.js` or ENV var issues. | [cryptpad](./cryptpad/) |

## Others?
[Create an Issue](https://github.com/GSA-TTS/collab-containers/issues/new) or Open a PR

## Steps to Deploy

1. Ensure you have the Cloud Foundry CLI installed and are logged into your cloud.gov account.
2. Navigate to this folder in your terminal.
3. Run the following command to deploy:
   ```bash
   cf login -a api.fr.cloud.gov --sso
   cd app-name  # Replace with the specific app folder, e.g., `hedgedoc`
   cf push
   ```
4. Access the application at the domain specified in the `CMD_DOMAIN` environment variable.
4. Access the application at the domain specified in the `CMD_DOMAIN` environment variable.

## Environment Variables

### HedgeDoc

- `CMD_DB_URL`: The database URL for HedgeDoc. This is dynamically set using the `VCAP_SERVICES` environment variable.
- `CMD_DOMAIN`: The domain name for the HedgeDoc instance.
- `CMD_ALLOW_ORIGIN`: CORS settings for the HedgeDoc instance.

### Excalidraw

- `NODE_ENV`: The environment in which Excalidraw is running (e.g., production).
- `PORT`: The port on which Excalidraw listens for incoming requests.

## License
This project is licensed under the CC0 1.0 Universal (CC0 1.0) Public Domain Dedication. You can copy, modify, distribute, and perform the work, even for commercial purposes, all without asking permission. For more information, please visit [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).