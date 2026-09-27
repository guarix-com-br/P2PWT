import { Emitter } from '../utils/events.js';
import { DataChannelTransport } from '../transport/DataChannel.js';

export class Peer extends Emitter {
  constructor(id, connection, { initiator, dataChannelOptions, transportOptions }) { super(); this.id = id; this.connection = connection; this.initiator = initiator; this.transport = null; this.connected = false; this.closed = false; this.dataChannelOptions = dataChannelOptions; this.transportOptions = transportOptions; this.streams = new Map(); this.#wire(); }
  #wire() {
    this.connection.onconnectionstatechange = () => { const state = this.connection.connectionState; if (state === 'connected' && !this.connected) { this.connected = true; this.emit('connect', this); } if (['failed', 'closed', 'disconnected'].includes(state)) this.close(new Error(`WebRTC ${state}`)); };
    this.connection.ondatachannel = ({ channel }) => this.#useChannel(channel);
    this.connection.ontrack = (event) => { const stream = event.streams[0] ?? new MediaStream([event.track]); if (!this.streams.has(stream.id)) { this.streams.set(stream.id, stream); this.emit('stream', this, stream); } };
    if (this.initiator) this.#useChannel(this.connection.createDataChannel('p2pt', { ordered: true, ...this.dataChannelOptions }));
  }
  #useChannel(channel) {
    if (this.transport) { channel.close(); return; }
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => { this.transport = new DataChannelTransport(channel, this.transportOptions); this.transport.on('sent', (size) => this.emit('sent', size)); this.emit('channelopen', this); };
    channel.onmessage = (event) => this.emit('data', event.data);
    channel.onclose = () => this.close(new Error('DataChannel closed'));
    channel.onerror = () => this.emit('error', new Error('DataChannel error'));
  }
  async createOffer() { const offer = await this.connection.createOffer(); await this.connection.setLocalDescription(offer); await waitForIce(this.connection); return this.connection.localDescription.toJSON(); }
  async acceptOffer(offer) { await this.connection.setRemoteDescription(offer); const answer = await this.connection.createAnswer(); await this.connection.setLocalDescription(answer); await waitForIce(this.connection); return this.connection.localDescription.toJSON(); }
  async acceptAnswer(answer) { await this.connection.setRemoteDescription(answer); }
  send(data) { if (!this.transport) throw new Error('Peer DataChannel is not open'); return this.transport.send(data); }
  addStream(stream) { for (const track of stream.getTracks()) this.connection.addTrack(track, stream); }
  close(error) { if (this.closed) return; this.closed = true; this.transport?.close(error); try { this.connection.close(); } catch {} this.emit('close', this, error); this.removeAllListeners(); }
}
async function waitForIce(connection, timeout = 8000) { if (connection.iceGatheringState === 'complete') return; await new Promise((resolve) => { const timer = setTimeout(done, timeout); function done() { clearTimeout(timer); connection.removeEventListener('icegatheringstatechange', onState); resolve(); } function onState() { if (connection.iceGatheringState === 'complete') done(); } connection.addEventListener('icegatheringstatechange', onState); }); }
