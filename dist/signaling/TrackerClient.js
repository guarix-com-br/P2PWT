import { Emitter } from '../utils/events.js';
import { randomId } from '../utils/ids.js';
export class TrackerClient extends Emitter {
  constructor(url, { reconnectDelay = 1500, maxReconnectDelay = 15000 } = {}) { super(); this.url = url; this.reconnectDelay = reconnectDelay; this.maxReconnectDelay = maxReconnectDelay; this.socket = null; this.closed = false; this.attempt = 0; }
  connect() { if (this.closed || this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return; const socket = this.socket = new WebSocket(this.url); socket.onopen = () => { this.attempt = 0; this.emit('open'); }; socket.onmessage = (event) => { try { this.emit('message', JSON.parse(event.data)); } catch { this.emit('error', new Error(`Invalid tracker message from ${this.url}`)); } }; socket.onerror = () => this.emit('error', new Error(`Tracker connection error: ${this.url}`)); socket.onclose = () => { if (this.socket === socket) this.socket = null; this.emit('close'); if (!this.closed) setTimeout(() => this.connect(), Math.min(this.maxReconnectDelay, this.reconnectDelay * 2 ** this.attempt++)); }; }
  send(message) { if (this.socket?.readyState !== WebSocket.OPEN) return false; this.socket.send(JSON.stringify(message)); return true; }
  close() { this.closed = true; this.socket?.close(); this.socket = null; }
  newOfferId() { return randomId(20); }
}
