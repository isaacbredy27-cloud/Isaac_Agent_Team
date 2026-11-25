# OWASP Top 10:2025 and LLM01 Prompt Injection — notes

Sources (read 2026-11-25): https://owasp.org/Top10/2025/ · https://genai.owasp.org/llmrisk/llm01-prompt-injection/

## OWASP Top 10:2025
A01 Broken Access Control · A02 Security Misconfiguration · A03 Software Supply Chain Failures · A04 Cryptographic Failures · A05 Injection · A06 Insecure Design · A07 Authentication Failures · A08 Software or Data Integrity Failures · A09 Security Logging and Alerting Failures · A10 Mishandling of Exceptional Conditions.

## LLM01:2025 Prompt Injection
- "A Prompt Injection Vulnerability occurs when user prompts alter the LLM's behavior or output in unintended ways … prompt injections do not need to be human-visible/readable, as long as the content is parsed by the model."
- **Direct:** the user's prompt alters behavior. **Indirect:** "an LLM accepts input from external sources, such as websites or files" — for us: resumes, job postings, repo files.
- "It is unclear if there are fool-proof methods of prevention." Mitigations:
  1. Constrain model behavior (role, limits, ignore attempts to modify core instructions).
  2. Define and validate expected output formats — "use deterministic code to validate adherence."
  3. Input and output filtering.
  4. Enforce privilege control and least privilege — "handle these functions in code rather than providing them to the model."
  5. Require human approval for high-risk actions.
  6. Segregate and identify external content.
  7. Adversarial testing and attack simulations.
