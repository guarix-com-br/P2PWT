import { Emitter } from './utils/events.js';
import { randomId } from './utils/ids.js';
import { PeerManager } from './peer/PeerManager.js';
import { SignalingManager } from './signaling/SignalingManager.js';
import { TransferManager } from './transfer/TransferManager.js';
import { StreamManager } from './streaming/StreamManager.js';

const DEFAULT_TRACKERS = ['wss://tracker.openwebtorrent.com', 'wss://tracker.webtorrent.dev'];
export class P2PT extends Emitter {
  constructor(options = {}) { super(); if (typeof RTCPeerConnection === 'undefined') throw new Error('P2PT requires browser WebRTC (RTCPeerConnection)'); this.options = { trackers: DEFAULT_TRACKERS, rtcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }, reconnect: true, ...options }; this.id = options.peerId ?? randomId(); this.room = null; this.metrics = { bytesSent: 0, bytesReceived: 0, messagesSent: 0, messagesReceived: 0 }; this.peerManager = new PeerManager(this.options); this.pendingOffers = new Map(); this.transferManager = new TransferManager(options.transfer); this.streams = new StreamManager(); this.#wire(); this.signaling = new SignalingManager({ trackers: this.options.trackers, peerId: this.id, announceInterval: options.announceInterval, offerFactory: async (offerId) => { const peer = this.peerManager.create(`pending:${offerId}`, true); this.pendingOffers.set(offerId, peer); const offer = await peer.createOffer(); return offer; }, answerFactory: async (id, offer) => { const peer = this.peerManager.create(id, false); return peer.acceptOffer(offer); }, answerHandler: async (id, answer, offerId) => { const pending = this.pendingOffers.get(offerId); this.pendingOffers.delete(offerId); if (!pending) return; this.peerManager.peers.delete(pending.id); pending.id = id; this.peerManager.peers.set(id, pending); await pending.acceptAnswer(answer); } }); this.signaling.on('error', (error) => this.emit('error', error)); }
  #wire() { this.peerManager.on('connect', (peer) => this.emit('peerconnect', peer)); this.peerManager.on('close', (peer, error) => this.emit('peerclose', peer, error)); this.peerManager.on('error', (peer, error) => this.emit('peererror', peer, error)); this.peerManager.on('stream', (peer, stream) => this.emit('stream', peer, stream)); this.peerManager.on('sent', (bytes) => { this.metrics.bytesSent += bytes; }); this.peerManager.on('data', async (peer, data) => { const bytes = typeof data === 'string' ? new TextEncoder().encode(data).byteLength : data.byteLength ?? 0; this.metrics.bytesReceived += bytes; if (await this.transferManager.receive(peer, data)) return; this.metrics.messagesReceived++; this.emit('message', peer, data); }); for (const name of ['file-start', 'file-progress', 'file-complete', 'file-error', 'file-cancel']) this.transferManager.on(name, (...args) => this.emit(name, ...args)); this.peerManager.on('connect', (peer) => this.streams.apply(peer)); }
  async join(room) { if (typeof room !== 'string' || !room.trim() || room.length > 128) throw new TypeError('room must be a non-empty string up to 128 characters'); if (this.room === room) return; this.leave(); this.room = room; await this.signaling.join(room); this.emit('join', room); }
  leave() { if (!this.room) return; this.signaling.leave(); this.pendingOffers.clear(); this.peerManager.closeAll(); const room = this.room; this.room = null; this.emit('leave', room); }
  get peers() { return [...this.peerManager.peers.values()].filter((peer) => peer.connected); }
  getPeers() { return this.peers; }
  send(peer, data) { const target = this.peerManager.get(peer); if (!target?.connected) throw new Error('Peer is not connected'); this.metrics.messagesSent++; return target.send(data); }
  broadcast(data) { return Promise.allSettled(this.peers.map((peer) => this.send(peer, data))); }
  sendFile(peer, file) { const target = this.peerManager.get(peer); if (!target?.connected) throw new Error('Peer is not connected'); return this.transferManager.send(target, file); }
  cancelFile(id) { return this.transferManager.cancel(id); }
  addStream(stream) { if (!(stream instanceof MediaStream)) throw new TypeError('stream must be a MediaStream'); return this.streams.add(stream, this.peers); }
  removeStream(stream) { return this.streams.remove(stream); }
  stats() { const values = [...this.peerManager.peers.values()]; return { peers: values.length, connected: values.filter((peer) => peer.connected).length, connecting: values.filter((peer) => !peer.connected && !peer.closed).length, ...this.metrics }; }
  destroy() { this.leave(); this.signaling.close(); this.streams.close(); this.removeAllListeners(); }
}
