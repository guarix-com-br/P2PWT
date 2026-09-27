const encoder = new TextEncoder(); const decoder = new TextDecoder();
export const CONTROL = 1;
export function encodeControl(message) { return JSON.stringify(message); }
export function decodeControl(value) { if (typeof value !== 'string') return null; try { const item = JSON.parse(value); return item && typeof item === 'object' ? item : null; } catch { return null; } }
export function encodeChunk(id, index, bytes) { const header = encoder.encode(`${id}:${index}:`); const output = new Uint8Array(1 + header.byteLength + bytes.byteLength); output[0] = CONTROL; output.set(header, 1); output.set(new Uint8Array(bytes), 1 + header.byteLength); return output.buffer; }
export function decodeChunk(buffer) { const view = new Uint8Array(buffer); if (view[0] !== CONTROL) return null; const split = decoder.decode(view.subarray(1)).match(/^([^:]+):(\d+):/); if (!split) return null; const prefix = encoder.encode(`${split[1]}:${split[2]}:`).byteLength; return { id: split[1], index: Number(split[2]), bytes: view.slice(1 + prefix).buffer }; }
