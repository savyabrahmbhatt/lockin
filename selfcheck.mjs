import assert from 'node:assert';
import { extractPlan, stripPlan, extractJSON } from './src/ai.js';
import { normalizeWeek, dayLoad, completion, catColor, parseHM, weekdayFor, WEEK_ORDER } from './src/util.js';

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

assert.equal(dayLoad([]), 0);
assert.ok(dayLoad(week.mon) > 0 && dayLoad(week.mon) <= 100);
assert.equal(dayLoad(Array(9).fill({ subs: [] })), 100, 'load must cap at 100');

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

console.log('selfcheck ok');
