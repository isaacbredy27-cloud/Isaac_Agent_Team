# Worked example: Matches flow spec (Wren)

Job to be done: "Show me which Orlando finance jobs I should apply to today."

| Step | Screen | User does next | States |
|---|---|---|---|
| 1 | Upload | Choose PDF/DOCX | idle · uploading · reading · error (type/size) |
| 2 | Profile review | Confirm or fix fields (inferred fields marked) | loading · ready · saving |
| 3 | Matches (tab 1) | Tap a card or open Filters | loading (skeletons) · list · empty-for-filters · offline banner |
| 4 | Filters (sheet, medium+large detents, grabber) | Toggle chips, then Done; Cancel restores | — |
| 5 | Job detail | Read why → Apply (new tab) or Save | explanation loading · template fallback |
| 6 | Saved (tab 2) | Update status | offline readable |

Rules applied: tab bar = navigation only (Matches · Saved · Gaps · Profile); one sheet at a time; every control ≥ 44 pt; band shown as icon + number + words.
