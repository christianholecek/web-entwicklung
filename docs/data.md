# data.md

## What Data Does This Project Use?

This project does not load external data files at runtime. All stimulus material is hardcoded directly in the JavaScript inside `index.html`. Below is a description of the data structures used.

---

## Stimulus Lists

### Task A — English Vowels
- **Format:** JavaScript array of objects, hardcoded in `index.html` (for now)
- **Items:** 11 vowel categories
- **Per item:** `key` (vowel label), `targetToken` (target word, e.g. `"heed"`), `primes` (array of 3 rhyming words)
- **Carrier sentences:** 2 templates per vowel (C1: "Say h__d again.", C2: "We said h__d together.")
- **Total recordings — German native speakers:** 22 (11 vowels × 2 conditions, primes + sentence)
- **Total recordings — English native speakers:** 22 (11 vowels × 2 conditions, sentence only — no primes)

```

### Task B — German Vowels
- **Format:** Same structure as Task A
- **Items:** 14 vowel categories (including front rounded vowels ü, ö not present in English)
- **Per item:** `key`, `targetToken` (mostly nonce words, e.g. `"hiet"`), `primes` (3 German rhyming words)
- **Carrier sentences:** 2 templates (C1: "Er hat H__t gesagt.", C2: "Wir haben H__t gesagt.")
- **Total recordings — both groups:** 28 (14 vowels × 2 conditions, primes + sentence)

---

## Randomization

- Item order is shuffled using a seeded pseudorandom number generator (mulberry32 algorithm)
- Task A seed: `1337`, Task B seed: `7331`
- The shuffle guarantees no two consecutive items share the same vowel category
- The same order is shown to all participants (reproducible and controlled)

---

## Participant Metadata

Collected on Screen 2 (participant details). Submitted once per session as a CSV row to the server upload endpoint.

| Field | Description |
|---|---|
| `session_id` | Random token generated on page load |
| `participant_id` | Researcher-assigned ID entered by participant |
| `group` | `DE` (German native) or `EN` (English native) |
| `year_of_birth` | 4-digit year |
| `sex` | F / M / O |
| `bundesland` | Austrian federal state |
| `city` | City or town the participant grew up in |
| `consent_time_iso` | ISO timestamp of consent |

---

## Output Files (Generated at Runtime)

| File | Format | When created |
|---|---|---|
| `{pid}__CONSENT__{timestamp}__S{session}.csv` | CSV | Once per session after participant details step |
| `{pid}_{target}_{lang}_{condition}_{take}.wav` | WAV 16-bit mono 48kHz | After each accepted recording |
| `{pid}__{task}__SESSION__{timestamp}__S{session}.csv` | CSV | After all items in a task are completed |

---

## Assets

| File | Location | Description |
|---|---|---|
| `logo_uni_graz_4c.jpg` | `img/` | University of Graz logo, loaded locally |


