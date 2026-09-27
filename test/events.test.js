import test from 'node:test';
import assert from 'node:assert/strict';
import { Emitter } from '../src/utils/events.js';
test('Emitter supports subscribe, once and unsubscribe', () => { const events = new Emitter(); let total = 0; const off = events.on('x', (value) => { total += value; }); events.once('x', (value) => { total += value * 10; }); events.emit('x', 1); events.emit('x', 1); off(); events.emit('x', 1); assert.equal(total, 12); });
