export const PROVIDERS = {
  anthropic: {
    label: 'Claude',
    keyHint: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-haiku-4-5-20251001', name: 'Quick', blurb: 'Cheapest and fastest. Good for small edits, weaker at whole plans.' },
      { id: 'claude-sonnet-5', name: 'Balanced', blurb: 'Recommended. Builds a proper week and still answers fast.' },
      { id: 'claude-opus-4-8', name: 'Smartest', blurb: 'Best plans and sharpest insights. Slower, costs more per message.' },
    ],
  },
  openai: {
    label: 'OpenAI',
    keyHint: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o-mini', name: 'Quick', blurb: 'Cheapest and fastest. Good for small edits, weaker at whole plans.' },
      { id: 'gpt-4o', name: 'Balanced', blurb: 'Recommended. Builds a proper week and still answers fast.' },
      { id: 'gpt-5', name: 'Smartest', blurb: 'Thinks before answering. Best plans, noticeably slower.', reasoning: true },
    ],
  },
  google: {
    label: 'Gemini',
    keyHint: 'AIza...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.0-flash-lite', name: 'Quick', blurb: 'Cheapest and fastest. Good for small edits, weaker at whole plans.' },
      { id: 'gemini-2.0-flash', name: 'Balanced', blurb: 'Recommended. Builds a proper week and still answers fast.' },
      { id: 'gemini-2.5-pro', name: 'Smartest', blurb: 'Thinks before answering. Best plans, noticeably slower.', reasoning: true },
    ],
  },
};

export const defaultModel = (provider) => PROVIDERS[provider].models[1].id;

// ponytail: OpenAI reasoning models reject max_tokens, temperature and the system role.
// Catalog entries carry a flag; the regex covers models the user types in by hand.
export function isReasoning(provider, id) {
  const hit = PROVIDERS[provider]?.models.find((m) => m.id === id);
  if (hit) return !!hit.reasoning;
  return provider === 'openai' && /^(o\d|gpt-5)/.test(id || '');
}

const PAD = (n) => String(n).padStart(2, '0');

// The model has no clock. Everything it plans is relative to this block.
export function nowContext(d = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `Right now it is ${days[d.getDay()]} ${d.getDate()} ${d.toLocaleString('en', { month: 'long' })} ${d.getFullYear()}, ${PAD(d.getHours())}:${PAD(d.getMinutes())} local time.
The week in this app always runs Monday to Sunday. Today is ${days[d.getDay()]}.
Never schedule a block in a time that has already passed today. Count real calendar days to every deadline.`;
}

const TASK_SHAPE = `task = {
  "title": "short, concrete, verb first",
  "time": "07:30 - 08:45",
  "category": "one of the user's categories",
  "weight": 1 to 5,
  "subs": ["step", "step", "step"],
  "impact_done": "what finishing buys, in units",
  "impact_miss": "what skipping costs, in units"
}`;

const PLAN_RULES = `Rules you must not break:

1. EVERY task gets subs. A block with no steps is a wish, not a plan. 3 to 6 steps each.
   - Gym block: the actual exercises with sets and reps. "Bench press 4x6 @ 60kg".
   - Study block: the actual topics. "Closures and the event loop", not "study JS".
   - Reading block: the book and the page range. "Atomic Habits, p.84-120".
   - Work block: the actual deliverables, not "work on project".
   - Admin or errands: each errand named.
2. WEIGHT every task 1 to 5. 1 = trivial (10 min, no focus). 3 = a real hour of effort.
   5 = draining, needs a fresh brain. Weight drives how the week is balanced.
3. BALANCE the week by weight, never by task count. Total weight on any single day must
   stay between 6 and 12. Never put two weight-5 tasks on the same day. Never dump the
   backlog on Monday - if a day is full, the work goes to the next day with room.
4. RHYTHM. Hard cognitive work goes in the user's stated peak hours. Physical work goes
   where they said they have energy. At least one day per week stays under weight 5 -
   that is the recovery day and it is load-bearing, not a gap to fill.
5. NO COLLISIONS. Two tasks may never overlap in time. Leave at least 15 minutes between
   blocks. Respect stated sleep, work hours, commute and non-negotiables absolutely.
6. SPREAD each goal across multiple days. A goal that appears on one day is not a plan.
   Recurring work (training, study, practice) repeats on its proper cadence with the
   content progressing across sessions - session 2 is not a copy of session 1.
7. STAKES. impact_done and impact_miss are concrete and personal: dates pulled forward or
   pushed back, kilos, hours banked or burned, money, the specific thing they said they
   want. Blunt and motivating. Never shaming, never generic, never merely consoling.
8. Use only the user's categories. If something genuinely fits none, say so in prose and
   suggest a category name rather than inventing one silently.`;

export const SYSTEM = `You are the coach inside Lock In, a life-operating-system app.
You are not a chatbot. You are the person who builds and defends someone's week.

PHASE 1 - INTERVIEW.
The user talks in plain language. Ask ONE short question at a time. Never show forms,
never show numbered option lists, never ask two things in one message. Maximum 7 questions.
Keep every question under 25 words.

Before you can plan you must know:
- every goal, in the user's own words, and the deadline or target date for each
- where they are starting from right now, in numbers where numbers exist
- their fixed commitments: work or study hours, sleep, commute, family duties
- when in the day they actually have energy, and when they are useless
- how many days a week they can realistically show up, honestly, not aspirationally
- their non-negotiables, and which goal they sacrifice first on a bad week

If an answer is vague, ask one follow-up to make it concrete. Do not accept "get fit"
or "learn coding" as a goal - push until there is a number and a date.

PHASE 2 - PLAN.
When you know enough, write two or three sentences naming the total weekly hours they
just signed up for and the single hardest trade-off in the plan. Then output ONE json
object inside a \`\`\`json fence and nothing after it:

{"goals":[{"title":"","deadline":"","metric":"start -> target"}],
 "week":{"mon":[task],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]}}

${TASK_SHAPE}

${PLAN_RULES}

PHASE 3 - LIVING PLAN.
After the plan exists the user will tell you what changed: illness, travel, a bad day, a
new deadline. Reschedule around it and return the same json shape. Protect the deadlines
first, the recovery day second. Say in one or two sentences what you moved and what it
cost them. Never silently drop work - if something genuinely will not fit, say which goal
slips and by how long.`;

export function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let candidate = fenced ? fenced[1] : null;
  if (!candidate) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    candidate = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function extractPlan(text) {
  const parsed = extractJSON(text);
  return parsed && parsed.week ? parsed : null;
}

export function stripPlan(text) {
  return text.replace(/```json[\s\S]*?```/, '').trim();
}

// ponytail: the point of these two prompts is that they are short. A spoken or typed
// tweak sends ONE task (~120 tokens), never the 7-day week (~3k).
const EDIT_SYSTEM = `Apply the user's instruction to the one JSON task they send.
Reply with ONLY the updated task as raw JSON. No fence, no prose.
Keep every key: title, time, category, weight, subs, impact_done, impact_miss, state.
subs is an array of {"title":"","done":false}. Preserve subs you were not asked to change,
and preserve each sub's done value. Times look like "07:30 - 09:30". weight is 1-5.
If the work changes, rewrite impact_done and impact_miss to match it - concrete units,
blunt, motivating, never shaming.`;

const SPLIT_SYSTEM = `Turn the user's one-line task into a single JSON task. Reply with ONLY
raw JSON, no fence, no prose.

${TASK_SHAPE}

Give it 3 to 6 real, specific steps - the actual exercises, topics, pages or deliverables,
never "plan it" or "get started". Infer a sensible time block from the user's day if they
named one, otherwise pick a plausible slot and keep it under two hours. Pick the category
from the list you are given. Weight it 1-5 by how draining it is. impact_done and
impact_miss are concrete and blunt.`;

export async function editTask({ provider, model, apiKey, task, instruction }) {
  const reply = await chat({
    provider, model, apiKey,
    system: EDIT_SYSTEM,
    maxTokens: 900,
    messages: [{ role: 'user', content: JSON.stringify(task) + '\n\n' + instruction }],
  });
  const next = extractJSON(reply);
  if (!next || !next.title) throw new Error("Didn't catch that. Say it again.");
  return next;
}

export async function splitTask({ provider, model, apiKey, text, categories, day }) {
  const reply = await chat({
    provider, model, apiKey,
    system: SPLIT_SYSTEM,
    maxTokens: 900,
    messages: [
      {
        role: 'user',
        content: `Categories: ${categories.join(', ')}\nDay: ${day}\n${nowContext()}\n\nTask: ${text}`,
      },
    ],
  });
  const task = extractJSON(reply);
  if (!task || !task.title) throw new Error('Could not break that down. Added it as-is.');
  return task;
}

const INSIGHT_SYSTEM = `You read a weekly completion summary and reply with 3 short
observations, each one line, each naming a number from the data. One must be the single
most useful thing to change next week. Be blunt and specific. No preamble, no bullets,
no markdown - just three lines separated by newlines.`;

export async function weekInsights({ provider, model, apiKey, summary }) {
  return chat({
    provider, model, apiKey,
    system: INSIGHT_SYSTEM,
    maxTokens: 400,
    messages: [{ role: 'user', content: JSON.stringify(summary) }],
  });
}

async function post(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Provider returned a non-JSON response (' + res.status + '): ' + text.slice(0, 200));
  }
  if (!res.ok) {
    const msg = json?.error?.message || json?.error?.status || json?.message || text.slice(0, 200);
    throw new Error(msg + ' (' + res.status + ')');
  }
  return json;
}

export async function chat({ provider, model, apiKey, messages, system = SYSTEM, maxTokens = 4096 }) {
  const m = model || defaultModel(provider);
  if (!apiKey) throw new Error('Add your ' + PROVIDERS[provider].label + ' API key in Profile first.');
  const dated = system + '\n\n' + nowContext();

  if (provider === 'anthropic') {
    const json = await post(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      { model: m, max_tokens: maxTokens, system: dated, messages }
    );
    return json.content.map((b) => b.text || '').join('');
  }

  if (provider === 'openai') {
    const reasoning = isReasoning(provider, m);
    const json = await post(
      'https://api.openai.com/v1/chat/completions',
      { Authorization: 'Bearer ' + apiKey },
      {
        model: m,
        // Reasoning models burn tokens thinking before they emit anything, so the cap
        // has to cover both or the reply comes back empty.
        ...(reasoning
          ? { max_completion_tokens: maxTokens * 4 }
          : { max_tokens: maxTokens }),
        messages: [{ role: reasoning ? 'developer' : 'system', content: dated }, ...messages],
      }
    );
    const out = json.choices?.[0]?.message?.content;
    if (!out) throw new Error('Model replied with nothing. Try the Balanced model.');
    return out;
  }

  const json = await post(
    'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + apiKey,
    {},
    {
      generationConfig: { maxOutputTokens: isReasoning(provider, m) ? maxTokens * 4 : maxTokens },
      systemInstruction: { parts: [{ text: dated }] },
      contents: messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    }
  );
  const parts = json.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('Model replied with nothing. Try the Balanced model.');
  return parts.map((p) => p.text || '').join('');
}
