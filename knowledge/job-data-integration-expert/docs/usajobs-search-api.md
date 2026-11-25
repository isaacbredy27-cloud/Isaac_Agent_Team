# USAJOBS Search API — notes

Sources: https://developer.usajobs.gov/general/quick-start and https://developer.usajobs.gov/api-reference/get-api-search (read 2026-11-25).

- Request an API key on the API Request page; the key is emailed.
- Required headers (quick start example):
  ```
  curl -H 'Host: data.usajobs.gov' \
       -H 'User-Agent: $YOUR_EMAIL' \
       -H 'Authorization-Key: $AUTH_KEY' \
       https://data.usajobs.gov/api/search?JobCategoryCode=2210
  ```
  ("Be sure to replace $YOUR_EMAIL with the email address you entered on the API request form.")
- `GET /api/Search` parameters include `Keyword`, `LocationName`, `Radius`, `JobCategoryCode`, `DatePosted`, `ResultsPerPage`.
- Finance series to query: 0501 (Financial Administration), 0510 (Accounting), 0560 (Budget Analysis).
- The reference page does not list rate limits.
