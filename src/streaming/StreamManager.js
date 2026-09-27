/** Keeps local MediaStreams and applies their tracks to every current/new peer. */
export class StreamManager {
  constructor() { this.streams = new Map(); }
  add(stream, peers) { this.streams.set(stream.id, stream); for (const peer of peers) peer.addStream(stream); return () => this.remove(stream.id); }
  apply(peer) { for (const stream of this.streams.values()) peer.addStream(stream); }
  remove(id) { const stream = this.streams.get(typeof id === 'string' ? id : id.id); if (!stream) return false; this.streams.delete(stream.id); for (const track of stream.getTracks()) track.stop(); return true; }
  close() { for (const stream of this.streams.values()) for (const track of stream.getTracks()) track.stop(); this.streams.clear(); }
}
