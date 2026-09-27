export function randomId(bytes = 16) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map((value) => value.toString(16).padStart(2, '0')).join('');
}
export async function roomInfoHash(room) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`p2pt:${room}`)));
  return String.fromCharCode(...bytes.slice(0, 20)); // WebTorrent tracker wire format
}
export function trackerPeerId(id) { return `-P2PT01-${id.slice(0, 12)}`.slice(0, 20); }
