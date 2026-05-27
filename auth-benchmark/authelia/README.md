# Authelia in this benchmark

Authelia should be included as a comparison point, but not as a direct Cloud.gov UAA client in the main cohort.

Why:

- Authelia is an authentication and authorization server plus portal.
- It is designed to work with a companion reverse proxy such as NGINX, Traefik, Caddy, or Envoy.
- For this experiment, that means Authelia measures the reverse-proxy-plus-authz pattern, not the single-binary UAA-auth-proxy pattern.

## How to score it fairly

Use Authelia as a control for:

- Session UX
- Access policy depth
- Operability of the portal plus forward-auth model
- Extra moving parts required to front arbitrary applications

Penalize or mark unsupported for:

- Direct Cloud.gov UAA upstream-client fit
- One-container drop-in deployment
- Dynamic backend selection without an additional routing proxy

## Recommended interpretation

If the goal is a universal Cloud.gov UAA-backed session that can sit directly in front of arbitrary apps, Authelia is not the lead candidate. It is still useful in the scorecard because it shows the cost of using a companion authz portal plus a separate edge proxy.
