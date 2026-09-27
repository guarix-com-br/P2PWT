import { Emitter } from '../utils/events.js';
/** Serializes sends and waits for bufferedAmount instead of flooding SCTP. */
export class DataChannelTransport extends Emitter {
  constructor(channel, { highWaterMark = 512 * 1024, maxMessageSize = 64 * 1024 } = {}) { super(); this.channel = channel; this.highWaterMark = highWaterMark; this.maxMessageSize = maxMessageSize; this.queue = []; this.draining = false; channel.bufferedAmountLowThreshold = Math.floor(highWaterMark / 2); channel.onbufferedamountlow = () => this.#drain(); }
  get ready() { return this.channel.readyState === 'open'; }
  send(data) { const size = typeof data === 'string' ? new TextEncoder().encode(data).byteLength : data.byteLength; if (size > this.maxMessageSize) throw new RangeError(`DataChannel message exceeds ${this.maxMessageSize} bytes`); if (!this.ready) throw new Error('DataChannel is not open'); return new Promise((resolve, reject) => { this.queue.push({ data, resolve, reject, size }); this.#drain(); }); }
  close(reason = new Error('DataChannel closed')) { while (this.queue.length) this.queue.shift().reject(reason); }
  #drain() { if (this.draining || !this.ready) return; this.draining = true; try { while (this.queue.length && this.channel.bufferedAmount < this.highWaterMark) { const next = this.queue.shift(); this.channel.send(next.data); this.emit('sent', next.size); next.resolve(); } } catch (error) { this.close(error); } finally { this.draining = false; } }
}
