
# Collaboration Containers for Deployment on cloud.gov

>Ephemeral/Short-lived for prototyping only

Each folder contains a `manifest.yml` file to deploy an ephemeral container on cloud.gov. 

## Deployment Status

| App         | Status   | Last Failure (if any) | Directory Link |
|-------------|----------|----------------------|----------------|
| [Marimo](https://github.com/marimo-team/marimo)      | ✅ Working |                      | [marimo](./marimo/) |
| [openvscode-server](https://github.com/gitpod-io/openvscode-server)  | ✅ Working |                      | [openVScode](./openVScode/) |
| [Excalidraw](https://github.com/excalidraw/excalidraw)  | ✅ Working |                      | [excalidraw](./excalidraw/) |
| [HedgeDoc](https://github.com/hedgedoc/hedgedoc)    | ✅ Working |                      | [hedgedoc](./hedgedoc/) |
| [Outline](https://github.com/outline/outline)     | ❌ Failing | GSA WAF blocks `/api/auth.config` with a 403 (dot-config block rule). | [outline](./outline/) |
| [Planka](https://github.com/plankanban/planka)      | ❌ Failing | Database resolved, but Cloud.gov SAML split-domain session cookie is stripped by browser (SameSite block). | [planka](./planka/) |
| [CryptPad](https://github.com/xwiki-labs/cryptpad)    | ✅ Working |                      | [cryptpad](./cryptpad/) |
| Auth proxy benchmark | 🧪 Experimental | Cloud.gov UAA benchmark harness and proxy manifests. | [auth-benchmark](./auth-benchmark/) |

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

## Benchmarking Auth Proxies

Use [auth-benchmark](./auth-benchmark/) to compare UAA-backed auth proxies in front of fixture apps or any of the deployed collaboration containers in this repository.

## License
This project is licensed under the CC0 1.0 Universal (CC0 1.0) Public Domain Dedication. You can copy, modify, distribute, and perform the work, even for commercial purposes, all without asking permission. For more information, please visit [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).