# Data documentation

## What data does this project use?

This project uses structured task and stimulus data for a browser-based speech recording tool. The final version no longer hardcodes the stimulus lists directly in `index.html`. Instead, the task definitions, vowel targets, prime words, carrier sentences, and task metadata are stored in JSON files in the `data/` folder.

The JavaScript application loads the task configuration at runtime and builds the recording tasks dynamically from these files. This makes the project easier to maintain because stimulus lists can be updated without rewriting the main application code.

---

## Data files

| File                  | Location | Purpose                                        |
| --------------------- | -------- | ---------------------------------------------- |
| `tasks.json`          | `data/`  | Main task configuration loaded by the app      |
| `stimuli_task_A.json` | `data/`  | English vowel task stimuli, if used separately |
| `stimuli_task_B.json` | `data/`  | German vowel task stimuli, if used separately  |

The central file for the final version is `data/tasks.json`. It defines the available tasks and contains the information needed to display each recording item.

---

## Task A: English rhyming task

Task A is the English vowel task. Participants see English prime words and a carrier sentence and record both in one take.

* **Language:** English
* **Target:** English vowel categories
* **Interaction pattern:** rhyming primes plus carrier sentence
* **Displayed material per item:** target token, prime words, and sentence
* **Recording:** participant records the primes and the sentence together

The task was redesigned so that Task A and Task B use the same interaction pattern. This gives participants a consistent experience across the English and German recording tasks.

---

## Task B: German rhyming task

Task B is the German vowel task. Participants see German prime words and a German carrier sentence with a target word or nonce word and record both in one take.

* **Language:** German
* **Target:** German vowel categories, including front rounded vowels not present in English
* **Interaction pattern:** rhyming primes plus carrier sentence
* **Displayed material per item:** target token, prime words, and sentence
* **Recording:** participant records the primes and the sentence together

---

## Task structure

Each task item contains the information needed to display one recording prompt. Depending on the task, this may include:

| Field                   | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `key`                   | Internal vowel or item label                       |
| `targetToken`           | Target word or nonce word shown to the participant |
| `primes`                | List of rhyming prime words                        |
| `sentence` or `carrier` | Carrier sentence shown on the recording screen     |
| `language`              | Task language                                      |
| `type`                  | Task type, such as rhyming, rating, or reading     |

The task data includes a `type` field so that future task types can be added without restructuring the whole application. The current final website implements the rhyming recording tasks. Additional types such as rating tasks or reading passages are planned as possible extensions.

---

## Randomisation

The recording items are shuffled using a seeded pseudorandom number generator. This keeps the order reproducible while still avoiding a fixed, alphabetic, or manually grouped presentation.

* Task A uses a fixed seed.
* Task B uses a fixed seed.
* The shuffle avoids placing two items with the same vowel category directly after each other.
* The same reproducible order can be shown across sessions.

This strategy supports controlled phonetic data collection because the task order is predictable for the researcher but not obviously ordered for participants.

---

## Participant metadata

Participant metadata is collected once near the beginning of the session and is reused for both tasks.

| Field              | Description                                    |
| ------------------ | ---------------------------------------------- |
| `session_id`       | Random session token generated on page load    |
| `participant_id`   | Researcher-assigned participant ID             |
| `group`            | Participant group selected on the first screen |
| `year_of_birth`    | Participant year of birth                      |
| `sex`              | Sex category selected by the participant       |
| `bundesland`       | Austrian federal state, where applicable       |
| `city`             | City or town the participant grew up in        |
| `consent_time_iso` | Timestamp of consent confirmation              |

The German-speaking group receives a shorter metadata form. The English-speaking group is routed through the longer language background questionnaire before starting the tasks.

---

## Runtime output

During the session, the app creates recording and session data.

| Output                           | Format                   | When created                          |
| -------------------------------- | ------------------------ | ------------------------------------- |
| Consent and participant metadata | CSV-like structured data | After consent and participant details |
| Questionnaire/session data       | Structured data          | During the participant flow           |
| Individual recordings            | WAV, encoded for storage | After each accepted recording         |
| Session log                      | Structured task metadata | At the end of each task               |

The recording workflow captures audio in the browser using the Web Audio API. Recordings are encoded as WAV files and checked for silence before being accepted.

---

## Storage

The final version uses Firebase Firestore for data storage. WAV files are base64-encoded and stored as documents in a `recordings` collection. Consent, questionnaire, and session log data are stored in a `sessions` collection.

Firebase Storage was not used because it requires a paid Firebase plan. Firestore was chosen as a workable free-tier solution for the course project.

Before using the tool for real research data collection, the Firestore security rules would need to be tightened and the data protection setup would need to be reviewed carefully.

---

## Assets

| File                   | Location | Description                             |
| ---------------------- | -------- | --------------------------------------- |
| `logo_uni_graz_4c.jpg` | `img/`   | University of Graz logo, loaded locally |

The logo is stored locally so the website does not depend on an external university server when deployed on GitHub Pages.
