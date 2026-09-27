import { Peer } from './Peer.js';
import { Emitter } from '../utils/events.js';
export class PeerManager extends Emitter {
  constructor(options) { super(); this.options = options; this.peers = new Map(); }
  create(id, initiator) { if (this.peers.has(id)) return this.peers.get(id); const connection = new RTCPeerConnection(this.options.rtcConfig); const peer = new Peer(id, connection, { initiator, dataChannelOptions: this.options.dataChannelOptions, transportOptions: this.options.transportOptions }); this.peers.set(id, peer); peer.on('connect', () => this.emit('connect', peer)); peer.on('data', (data) => this.emit('data', peer, data)); peer.on('stream', (_, stream) => this.emit('stream', peer, stream)); peer.on('sent', (bytes) => this.emit('sent', bytes)); peer.on('error', (error) => this.emit('error', peer, error)); peer.on('close', (_, error) => { this.peers.delete(id); this.emit('close', peer, error); }); return peer; }
  get(id) { return this.peers.get(typeof id === 'string' ? id : id?.id); }
  closeAll() { for (const peer of [...this.peers.values()]) peer.close(); this.peers.clear(); }
}
