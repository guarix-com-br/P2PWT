/** A small EventTarget-like emitter that also works outside a browser. */
export class Emitter {
  #listeners = new Map();
  on(event, listener) { const set = this.#listeners.get(event) ?? new Set(); set.add(listener); this.#listeners.set(event, set); return () => this.off(event, listener); }
  once(event, listener) { const off = this.on(event, (...args) => { off(); listener(...args); }); return off; }
  off(event, listener) { this.#listeners.get(event)?.delete(listener); }
  emit(event, ...args) { for (const listener of [...(this.#listeners.get(event) ?? [])]) listener(...args); }
  removeAllListeners() { this.#listeners.clear(); }
}
