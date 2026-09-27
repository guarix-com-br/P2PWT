import test from 'node:test';
import assert from 'node:assert/strict';
import { TransferManager } from '../src/transfer/TransferManager.js';

test('file transfer sends chunks and receiver validates SHA-256', async () => {
  const sender = new TransferManager({ chunkSize: 4 });
  const receiver = new TransferManager({ chunkSize: 4 });
  const peer = { id: 'a', async send(data) { await receiver.receive(remote, data); } };
  const remote = { id: 'b' };
  let completed;
  receiver.on('file-complete', (_peer, item) => { completed = item; });
  const file = new File([new TextEncoder().encode('abcdefghij')], 'sample.txt', { type: 'text/plain' });
  await sender.send(peer, file);
  assert.equal(completed.name, 'sample.txt');
  assert.equal(await completed.file.text(), 'abcdefghij');
  assert.equal(completed.progress, 1);
});
