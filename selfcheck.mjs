import assert from 'node:assert';
import { extractPlan, stripPlan, extractJSON, isReasoning, nowContext, defaultModel } from './src/ai.js';
import {
  normalizeWeek, dayLoad, dayWeight, completion, catColor, parseHM, weekdayFor, WEEK_ORDER,
  removeTask, moveTask, weekStats, byTime, taskPhase, subProgress,
} from './src/util.js';

const reply = `Here is the load: 340 hours over 16 weeks.

\`\`\`json
{"goals":[{"title":"Lose 10 kg","deadline":"31 dec","metric":"84 -> 74 kg"}],
 "week":{"mon":[{"title":"Strength - push","time":"07:30 - 08:45","category":"Health",
 "subs":["Bench 4x6","Overhead press 4x8"],"impact_done":"Session banked.","impact_miss":"Eight weeks lost."}],
 "tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]}}
\`\`\``;

const plan = extractPlan(reply);
assert.equal(plan.goals[0].title, 'Lose 10 kg');
assert.equal(plan.week.mon.length, 1);
assert.ok(!stripPlan(reply).includes('json'), 'prose must not leak the fence');
assert.equal(extractPlan('no plan here'), null);

const week = normalizeWeek(plan.week);
assert.deepEqual(week.mon[0].subs[0], { title: 'Bench 4x6', done: false });
assert.equal(week.mon[0].state, 'pending');
assert.deepEqual(Object.keys(week).length, 7);

// load is driven by weight, not task count: 4 draining blocks overflow a day
assert.equal(dayLoad([]), 0);
assert.equal(dayWeight([{ weight: 5 }, { weight: 2 }]), 7);
assert.equal(dayWeight([{}]), 3, 'a task with no weight counts as real work');
assert.equal(dayLoad([{ weight: 3 }, { weight: 3 }]), 50);
assert.equal(dayLoad(Array(4).fill({ weight: 5 })), 100, 'load must cap at 100');

assert.equal(completion({}), 0);
assert.equal(completion({ mon: [{ state: 'done' }, { state: 'pending' }] }), 50);

assert.equal(catColor('health', [{ name: 'Health', color: '#34d399' }]), '#34d399');
assert.equal(catColor('nope', []), '#7a7a84');

// voice edit returns a bare task, no fence and no week key
const edited = extractJSON('{"title":"Strength - push","time":"06:00 - 07:00","subs":["Incline press 4x8"]}');
assert.equal(edited.time, '06:00 - 07:00');
assert.equal(extractPlan(JSON.stringify(edited)), null, 'a single task is not a plan');
assert.equal(extractJSON('sure thing, boss'), null, 'prose without json must fail loudly');

// reminder scheduling
assert.deepEqual(parseHM('07:30 - 09:30'), { hour: 7, minute: 30 }, 'start time wins');
assert.equal(parseHM('whenever'), null);
assert.equal(parseHM('99:99'), null);
assert.deepEqual(WEEK_ORDER.map((_, i) => weekdayFor(i)), [2, 3, 4, 5, 6, 7, 1], 'mon..sun -> expo 1=sun');

// moving and deleting must not corrupt the other days
const w2 = { mon: [{ title: 'a' }, { title: 'b' }], tue: [] };
assert.deepEqual(removeTask(w2, 'mon', 0).mon.map((t) => t.title), ['b']);
assert.equal(removeTask(w2, 'mon', 0).tue.length, 0);
const moved = moveTask(w2, 'mon', 1, 'tue');
assert.deepEqual(moved.mon.map((t) => t.title), ['a']);
assert.deepEqual(moved.tue.map((t) => t.title), ['b']);
assert.equal(moveTask(w2, 'mon', 0, 'mon'), w2, 'moving to the same day is a no-op');
assert.equal(moveTask(w2, 'mon', 9, 'tue'), w2, 'out-of-range index must not create holes');

// stats: percentages ignore tasks that are still open, so a fresh week is not "0% done"
const stats = weekStats(
  {
    mon: [{ category: 'Health', state: 'done', weight: 5 }, { category: 'Work', state: 'missed', weight: 2 }],
    wed: [{ category: 'Health', state: 'done', weight: 4 }],
    fri: [{ category: 'Work', state: 'pending', weight: 1 }],
  },
  [{ name: 'Health', color: '#0f0' }, { name: 'Work', color: '#00f' }]
);
assert.equal(stats.pct, 67, '2 done of 3 closed');
assert.equal(stats.open, 1);
assert.equal(stats.totalWeight, 12);
assert.equal(stats.byCategory[0].name, 'Health', 'heaviest category ranks first');
assert.equal(stats.byCategory[0].pct, 100);
assert.equal(stats.heaviestDay, 'mon');
assert.equal(stats.streak, 1, 'wed was perfect, mon was not');
assert.equal(weekStats({}, []).pct, 0, 'empty week must not divide by zero');

// reasoning models need different request fields, so detection must be right
assert.equal(isReasoning('openai', 'gpt-5'), true);
assert.equal(isReasoning('openai', 'o3-mini'), true, 'hand-typed o-series counts');
assert.equal(isReasoning('openai', 'gpt-4o'), false);
assert.equal(isReasoning('anthropic', 'claude-sonnet-5'), false);
assert.equal(defaultModel('anthropic'), 'claude-sonnet-5', 'default is the Balanced model');

// the model has no clock unless we give it one
const ctx = nowContext(new Date(2026, 8, 13, 14, 5));
assert.ok(ctx.includes('Sunday 13 September 2026'), ctx);
assert.ok(ctx.includes('14:05'), 'zero-padded 24h time');
assert.ok(ctx.includes('Monday to Sunday'));

// display ordering: timed blocks in clock order, untimed sink to the bottom
const rows = [{ time: '' }, { time: '18:00 - 19:00' }, { time: '06:30 - 07:30' }];
assert.deepEqual([...rows].sort(byTime).map((r) => r.time), ['06:30 - 07:30', '18:00 - 19:00', '']);

// "happening now" highlight
const block = { time: '09:00 - 10:30' };
assert.equal(taskPhase(block, 9 * 60 + 30), 'now');
assert.equal(taskPhase(block, 10 * 60 + 30), 'past', 'the end minute is already over');
assert.equal(taskPhase(block, 8 * 60 + 45), 'soon');
assert.equal(taskPhase(block, 6 * 60), 'later');
assert.equal(taskPhase({ time: '' }, 600), 'untimed');
assert.equal(taskPhase({ time: '09:00' }, 9 * 60 + 59), 'now', 'no end time means assume an hour');

assert.deepEqual(subProgress({ subs: [{ done: true }, { done: false }] }), { done: 1, total: 2 });
assert.deepEqual(subProgress({}), { done: 0, total: 0 });

console.log('selfcheck ok');
