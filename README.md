# Lock In

Goals in, adaptive week out. You talk to the coach in plain language, it interviews you,
then it builds a Monday-to-Sunday plan with real sub-tasks and per-task stakes.

## Run it

```bash
npm start          # then scan the QR with Expo Go
npm run android    # if you have an emulator
node selfcheck.mjs # asserts plan parsing, week normalising, load capping
```

## Build the APK

No Android SDK needed — EAS builds it in the cloud.

```bash
npm i -g eas-cli
eas login          # free Expo account
eas build -p android --profile apk
```

The `apk` profile in `eas.json` produces an installable `.apk` (the `production` profile
produces an `.aab` for Play Store). When the build finishes EAS prints a download link.

## Voice

Every place you can type, you can talk. Onboarding answers, "something changed, fix my day",
and — inside any open task — "Change this by voice": *"swap bench for incline press"*,
*"move it to 6 am"*, *"add 20 minutes of stretching"*.

Speech-to-text runs on the phone (Android/iOS system recogniser), so no audio is uploaded and
transcription costs nothing. Only the transcript goes to the LLM, and a task edit sends **only
that one task** (~120 tokens) with a short edit prompt — not the whole week (~3k). The model
replies with just the patched task JSON.

## Notifications

Each task with a time in it gets a weekly local reminder at that time, then two follow-ups at
+25 and +90 minutes if it still isn't marked done — the first asks whether you started, the
second quotes what skipping costs. Marking it done cancels the nags. Rescheduling the week
reschedules everything.

## Weight, not task count

Every task carries a weight of 1–5 (trivial → draining). A day is full at total weight 12, and
the planner is told to keep every day between 6 and 12 and to leave one day under 5. That is what
stops the model dumping the whole backlog on Monday. You can re-weight any task by hand in its
detail panel, along with changing its category, moving it to another day, or deleting it.

## AI provider

First run asks for this before anything else: pick Claude, OpenAI or Gemini, then pick
**Quick / Balanced / Smartest** — no model IDs to decode — and paste a key. There's a direct
link to each provider's key page. The key lives in the device keystore (`expo-secure-store`)
and is sent only to that provider. You pay your own usage.

The Smartest options are reasoning models, which need different request fields than normal
ones (`max_completion_tokens`, the `developer` role, a much larger token ceiling to cover the
thinking). `isReasoning()` in `src/ai.js` handles that, including for models typed in by hand.

Every request carries the current date, weekday and clock time, so the coach never schedules
a block into a time that already passed and counts real days to your deadlines.

## Layout

| file | what |
| --- | --- |
| `App.js` | tab shell, state load/save |
| `src/ai.js` | provider adapters, coach system prompt, plan JSON extraction |
| `src/storage.js` | AsyncStorage state + keystore for API keys |
| `src/util.js` | week helpers, day load, completion, time parsing |
| `src/notify.js` | weekly local reminders from task times |
| `src/components/Mic.js` | on-device speech-to-text button |
| `src/screens/` | Onboarding (chat), Today, Plan, Tasks, Progress, Profile |
| `src/components/` | animated background, task row, shared UI |

## Not built yet

No backend. Each user brings their own key, so a proxy protects nothing until there is
cross-device sync or a shared team key — add it then, not now. Also skipped: push
reminders, calendar import, weekly review screen.
