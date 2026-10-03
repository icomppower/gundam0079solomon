# Security Policy

## Scope

This project is a **static, client-side** website: a single-page Three.js app served as plain files. It has **no
backend, no server-side code, no authentication, no database, no secrets, and it collects no user accounts or personal
data**. There is nothing to breach on a server, because there is no server.

The only third-party surface is:

- **Three.js r160** and a few of its example add-ons (GLTF loader, post-processing), vendored and version-pinned in
  `lib/three/`. Nothing is loaded from a CDN at runtime. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Reporting a vulnerability

If you find a security issue, please report it **privately** using GitHub's **Report a vulnerability** button in this
repository's **Security** tab (Security → Advisories → Report a vulnerability). I will review and respond as soon as I
reasonably can.

Please do **not** open a public issue for a security report.
