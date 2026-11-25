# OWASP File Upload and Secrets Management cheat sheets — notes

Sources (read 2026-11-25): https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html · https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

## File upload
- Defense in depth. Validate extension **after decoding** the filename; watch for double extensions (`.jpg.php`), null bytes (`.php%00.jpg`), case tricks, NTFS streams (reject `:`).
- "The Content-Type for uploaded files is provided by the user, and as such cannot be trusted." Use an allow-list.
- File signature (magic bytes) validation "should not be used on its own."
- Generate a random server-side filename (UUID); if user names are needed, limit length and characters.
- Store files on a different host or **outside the webroot**; if read access is needed, require authorization.
- Set upload size limits (after decompression for archives).

## Secrets management
- Least privilege; fine-grained access per secret.
- "Regularly rotate secrets so that any stolen credentials will only work for a short time."
- Create secrets to expire after a defined time where possible.
- Revoked/rotated secrets "must be removed from the exposed system immediately, including secrets discovered in code or logs."
- Document: who has access, how it rotates, dependencies, incident contact, impact of exposure.
