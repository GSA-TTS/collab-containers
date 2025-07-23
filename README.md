# HedgeDoc Deployment on cloud.gov

This folder contains a `manifest.yml` file to deploy an ephemeral container on cloud.gov. 

print[HedgeDoc](/hedgedoc) is a collaborative markdown editor. This setup uses PostgreSQL for persistence.

## Steps to Deploy

1. Ensure you have the Cloud Foundry CLI installed and are logged into your cloud.gov account.
2. Navigate to this folder in your terminal.
3. Run the following command to deploy:
   ```bash
   cf login -a api.fr.cloud.gov --sso
   cd hedgedoc
   cf push
   ```
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