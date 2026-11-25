# Cedar Grove Family Clinic guide

Portfolio demo of an AI chat assistant for a fictional clinic. It answers from a patient guide, calls scheduling tools, and refuses clinical advice. Subdomain label: `clinic-chat`.

Nothing here is a real clinic, a real patient, or a HIPAA-covered deployment. Do not type real health information.

## Run it

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
```

The eval suite books a new-patient visit, checks in-network and out-of-network plans, refuses dosing and diagnosis, and sends chest pain, stroke signs, and suicidal ideation to 911 (and 988 for a suicide crisis). It does not need an API key.

Copy `.env.example` if you want the optional wording model or a different desk key. Without `OPENAI_API_KEY`, the local engine still runs the full chat.

Staff desk: [http://127.0.0.1:43123/admin](http://127.0.0.1:43123/admin). Demo key: `cedar-demo`.

## What a new patient can do

1. Ask whether Blue Cross Blue Shield is accepted.
2. Ask for family medicine in Spanish.
3. Pick an opening.
4. Give a name and a 555 callback number and receive a `CG-` confirmation.

The same path is the **Play the new-patient booking** button in the chat.

## What the guide can call

| Tool | What it does |
| --- | --- |
| `find_provider` | Specialty and language search |
| `get_available_slots` | Openings for a clinician and visit type |
| `book_appointment` | Holds a slot with a name and phone |
| `reschedule_appointment` / `cancel_appointment` | Moves or releases a confirmation code |
| `check_insurance` | In network, out of network, unknown, or self-pay |
| `request_refill` | Opens a staff ticket. Never approves it |
| `create_callback_request` | Asks the front desk to call |

Emergency turns flag a staff handoff and stop. The handoff stores a category, not the message.

## HIPAA-minded choices in this demo

- No diagnosis, dosing, or lab interpretation.
- Emergency keyword detection with 911, and 988 for suicidal ideation.
- Consent before a transcript is stored.
- Minimum necessary contact data: name and callback number.
- Phone numbers, emails, SSNs, dates of birth, and member IDs are masked in transcripts, tool traces, and the audit log.
- Revealing a callback number on the staff desk is audited.
- Chat retention is 30 days and does not delete the schedule. Chat is not the medical record.
- Synthetic data only.

A real deployment would still need a business associate agreement, encryption at rest, real access control, and a privacy notice. Those limits are also written at `/docs`.

The runtime store is `data/runtime-store.json` and is gitignored. It can contain synthetic callback numbers.
