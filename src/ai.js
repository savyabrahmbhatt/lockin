import { WEEK_ORDER, DAY_LABELS, compactWeek } from './util.js';

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

// ponytail: the interview NEVER writes the plan. It writes a dossier. The week is then
// built in two later stages (skeleton, then one call per day) so no single call has to
// hold a whole detailed week in its head - that is what made small models dump
// everything on Monday with no steps.
export const SYSTEM = `You are the coach inside Lock In, a life-operating-system app.
You are not a chatbot. You are the person who interrogates someone before building
the week they will actually live.

YOUR ONLY JOB RIGHT NOW IS TO INVESTIGATE. Do not write a plan. Do not list tasks.
Do not output a schedule. Someone else builds the plan from your dossier.

HOW YOU ASK.
One short question at a time. Under 25 words. No forms, no numbered menus, never two
questions in one message. Ask up to 14 questions - more if the user is still vague,
fewer if they hand you a detailed brief up front.

IF THE USER PASTES A LONG PLAN OR SPEC:
Do not accept it and move on. Read it, then ask only about what it does NOT say.
A long document always leaves holes. Name the hole in the question.

WHAT YOU MUST KNOW BEFORE YOU STOP. Never skip a line here just because the user
sounds confident. If it is missing, ask.

1. GOALS. Every goal in their words, each with a deadline and a number. "Get fit" and
   "learn system design" are not goals. Push until there is a start value and a target.
2. BASELINE. Where they are today in numbers: weight, current lifts or fitness level,
   current salary, current skill level, current hours slept, current habits.
3. FIXED LIFE. Exact work or study hours, days of the week, commute, sleep and wake
   times, family duties, anything immovable. Ask for clock times, not "mornings".
4. WORK ITSELF. Their job is part of the week, not a hole in it. Ask what actually
   happens in their working day and whether they want work blocks in the plan.
5. INTENSITY. Directly ask how hard they want this. Gentle and sustainable, or brutal?
   For training: how many days, how long per session, how close to failure. For study:
   deep multi-hour blocks or short daily reps. Their answer changes every block you
   commission - never guess it.
6. EQUIPMENT AND RESOURCES. Gym or home, what machines, what instrument, which book or
   course, which tools. You cannot prescribe a lat pulldown to someone with dumbbells.
7. EXPERIENCE. Beginner, returning after a break, or advanced - per area. This sets
   volume, weight and difficulty.
8. HARD LIMITS. Injuries, health conditions, dietary rules, allergies, medication,
   anything that makes a normal prescription wrong or dangerous.
9. HONEST CAPACITY. How many days a week they will really show up. Then ask what they
   drop first on a bad week.
10. PROGRESSION. Whether this is one week or a longer programme, and if longer, what
    the first week specifically has to achieve.

If two facts they gave you contradict each other, say so and make them pick.

WHEN YOU ARE DONE.
Write two or three sentences naming the weekly hours they just committed to and the
single hardest trade-off ahead. Then output ONE json object inside a \`\`\`json fence
and nothing after it:

{"goals":[{"title":"","deadline":"","metric":"start -> target"}],
 "categories":["Work","Health","Career","Personal"],
 "brief":"..."}

categories: 3 to 6 major areas that cover every goal AND their day job. These become
the app's categories, so name them for this person, not generically.

brief: a dense dossier written for another coach who will never speak to this user.
Third person, plain sentences, no markdown, no bullets. 200-400 words. It MUST carry:
exact clock times of work and sleep, intensity level per area, equipment and resources
by name, experience level per area, injuries and limits, days available, the
non-negotiables, what gets dropped first, the specific programme structure they agreed
to, and what week one in particular must deliver. Anything missing from the brief will
be invented later, badly. Write it as if the next coach is blind.`;

const SKELETON_SYSTEM = `You lay out the SHAPE of one week. Titles, times, categories and
weights only. Someone else writes the steps inside each block - do not write them.

Reply with ONLY raw JSON, no fence, no prose:
{"week":{"mon":[{"title":"","time":"07:30 - 08:45","category":"","weight":3}],
 "tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]}}

${PLAN_RULES}

Additional rules for the shape:
- The user's JOB IS IN THE WEEK. Put their actual working hours in as blocks on their
  working days, in their work category, weighted for how draining that job is. A plan
  that pretends the job does not exist is useless.
- Fixed daily anchors the brief names - sleep, meals, commute, skincare, wind-down -
  appear as real blocks too if they are things the user must remember to do.
- Build ONLY the week you are asked for. If this is week 1 of a longer programme, week 1
  is a re-entry week: lower volume, habits first. Do not plan weeks 2 onward.
- Every category you were given must appear at least twice in the week.
- Count the blocks per day before you answer. Between 4 and 9 blocks per day, total
  weight 6 to 12. If a day breaks that, move a block to a lighter day and re-count.`;

const DETAIL_SYSTEM = `You write the inside of ONE day's blocks. The shape is already
decided - do not change any title, time, category or weight. Do not add or remove blocks.

Reply with ONLY raw JSON, no fence, no prose:
{"tasks":[${TASK_SHAPE.replace('task = ', '')}]}

Return the SAME number of tasks in the SAME order you were given.

For each block write 3 to 6 steps that a person could follow without thinking. Use the
brief: the equipment they actually have, their experience level, their stated intensity,
their injuries, their named book or course. Be specific to the point of being boring:
- Training: exercise, sets x reps, and load or RPE. "Lat pulldown 3x10, 2 reps in reserve".
- Study: the actual chapter, topic or problem. "Alex Xu ch.4 rate limiting - draw it closed book".
- Meals: the actual food and the protein number. "4 eggs + 250g curd, 38g protein".
- Work: the actual deliverables or meeting types they described.
- Practice: the specific drill, song or scale, progressing from the previous session.
Never write "plan it", "get started", "focus", "do your best" or any other filler step.

impact_done and impact_miss are concrete, personal and in units - kilos, hours, days of
deadline, money, the exact thing the brief says they want. Blunt, never shaming.`;

const COMMAND_SYSTEM = `You edit an existing week from one instruction. The instruction may
name any day or several days, and may add, delete, move, reschedule or rewrite blocks.

You are given the whole week in compact form and the user's instruction.

Reply with ONLY raw JSON, no fence, no prose:
{"note":"one sentence on what you changed and what it costs","days":{"tue":[task,...]}}

${TASK_SHAPE}

Rules:
- Put in "days" ONLY the days you actually changed. Untouched days must not appear.
- For each changed day, return the COMPLETE list of blocks that day should end with,
  in full task form, including the blocks you are keeping unchanged.
- To delete a block, return the day without it. To move a block, return BOTH days:
  the source without it and the target with it.
- New or rewritten blocks get 3 to 6 real, specific steps - never filler.
- Keep every day's total weight between 6 and 12 and never overlap two blocks in time.
- If the instruction is ambiguous about which day, pick the most likely one and say which
  one you picked in "note".`;

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

// The interview now ends with a dossier, not a week.
export function extractBrief(text) {
  const parsed = extractJSON(text);
  return parsed && parsed.brief ? parsed : null;
}

// ponytail: two stages. Stage 1 decides the shape of the week only (small output, so the
// balancing rules actually get obeyed). Stage 2 fires one call PER DAY in parallel to fill
// in the steps. Seven small calls beat one huge one on every model, and a day that fails
// degrades to its skeleton instead of taking the whole plan down.
export async function buildWeek({
  provider, model, apiKey, brief, goals = [], categories = [], weekNumber = 1, previous = '', onStage,
}) {
  onStage?.('shape');
  const reply = await chat({
    provider, model, apiKey,
    system: SKELETON_SYSTEM,
    maxTokens: 3000,
    messages: [
      {
        role: 'user',
        content:
          `Build the shape of WEEK ${weekNumber}.\n\nCategories: ${categories.join(', ')}\n` +
          `Goals: ${goals.map((g) => `${g.title} (${g.deadline || 'no date'}, ${g.metric || ''})`).join(' | ')}\n` +
          (previous ? `\nHow last week actually went: ${previous}\n` : '') +
          `\nDossier:\n${brief}`,
      },
    ],
  });
  const skeleton = extractJSON(reply);
  if (!skeleton?.week) throw new Error('Could not lay out the week. Try the Balanced or Smartest model.');

  onStage?.('detail');
  const filled = await Promise.all(
    WEEK_ORDER.map((d) => detailDay({ provider, model, apiKey, brief, day: d, tasks: skeleton.week[d] || [] }))
  );
  const week = {};
  WEEK_ORDER.forEach((d, i) => {
    week[d] = filled[i];
  });
  return week;
}

async function detailDay({ provider, model, apiKey, brief, day, tasks }) {
  if (!tasks.length) return [];
  try {
    const reply = await chat({
      provider, model, apiKey,
      system: DETAIL_SYSTEM,
      maxTokens: 3000,
      messages: [
        {
          role: 'user',
          content: `Day: ${DAY_LABELS[day]}\n\nBlocks:\n${JSON.stringify(tasks)}\n\nDossier:\n${brief}`,
        },
      ],
    });
    const out = extractJSON(reply);
    const list = out?.tasks;
    if (!Array.isArray(list) || list.length !== tasks.length) return tasks;
    // The shape is ours, not the model's - it only gets to fill in the inside.
    return list.map((t, i) => ({ ...t, ...tasks[i], subs: t.subs || [] }));
  } catch {
    return tasks;
  }
}

export async function commandWeek({ provider, model, apiKey, week, instruction, categories = [], brief = '' }) {
  const reply = await chat({
    provider, model, apiKey,
    system: COMMAND_SYSTEM,
    maxTokens: 3000,
    messages: [
      {
        role: 'user',
        content:
          `Categories: ${categories.join(', ')}\n` +
          (brief ? `Dossier: ${brief}\n` : '') +
          `\nCurrent week:\n${JSON.stringify(compactWeek(week))}\n\nInstruction: ${instruction}`,
      },
    ],
  });
  const out = extractJSON(reply);
  if (!out?.days) throw new Error("Didn't catch that. Name the day and what to change.");
  return { days: out.days, note: out.note || '' };
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
