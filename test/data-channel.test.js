import test from 'node:test';
import assert from 'node:assert/strict';
import { DataChannelTransport } from '../src/transport/DataChannel.js';
class FakeChannel { constructor() { this.readyState = 'open'; this.bufferedAmount = 0; this.sent = []; } send(value) { this.sent.push(value); this.bufferedAmount += 1; } }
test('DataChannelTransport queues and enforces a message limit', async () => { const channel = new FakeChannel(); const transport = new DataChannelTransport(channel, { highWaterMark: 2, maxMessageSize: 8 }); await transport.send('one'); await transport.send('two'); assert.deepEqual(channel.sent, ['one', 'two']); assert.throws(() => transport.send('too-large'), /exceeds/); });
