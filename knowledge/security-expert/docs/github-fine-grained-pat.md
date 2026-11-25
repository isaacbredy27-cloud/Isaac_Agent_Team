# GitHub fine-grained personal access tokens — notes (ADR 0001)

Source: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens (read 2026-11-24)

- "Each token can be further limited to only access specific repositories." Choose **Only select repositories**; "You should choose the minimal repository access that meets your needs."
- Permissions are granted per area with levels `read`, `write`, `admin` (not every permission supports every level). "You should choose the minimal permissions necessary."
- Expiration: `expires_in` 1–366 days or `none`; default 30 days; orgs may enforce a maximum. "We highly recommend adding an expiration."
- Org owners can require approval; pending tokens read only public resources.
- Gaps vs classic tokens include: contributing to repos where you are an outside collaborator, multiple orgs at once, Packages, Checks API, user-owned Projects.
- Our token: this repo only; **Contents: read & write**; 90-day expiry. Workflow files need "Workflows" write, which we don't grant (GitHub Contents docs).
