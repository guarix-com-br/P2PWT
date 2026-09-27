/* Classic browser script. It loads the library lazily so this file needs no module syntax. */
(async () => {
  const $ = (id) => document.getElementById(id);
  const log = (line) => { $('log').textContent = `${line}\n${$('log').textContent}`; };
  let p2p;
  let P2PT;

  try {
    ({ default: P2PT } = await import('../src/index.js'));
    $('status').value = 'Pronto para conectar';
  } catch (error) {
    $('status').value = 'Falha ao carregar a biblioteca';
    log(`Erro ao carregar: ${error.message}`);
    return;
  }

  function renderPeers() {
    $('peers').replaceChildren(...p2p.peers.map((peer) => Object.assign(document.createElement('li'), {
      textContent: peer.id
    })));
  }

  $('join').onclick = async () => {
    try {
      p2p?.destroy();
      p2p = new P2PT();
      p2p.on('peerconnect', (peer) => { log(`Conectado: ${peer.id}`); renderPeers(); });
      p2p.on('peerclose', () => renderPeers());
      p2p.on('message', (peer, data) => log(`${peer.id}: ${data}`));
      p2p.on('file-progress', (_peer, item) => { $('progress').value = item.progress; });
      p2p.on('file-complete', (_peer, item) => log(`Arquivo recebido: ${item.name}`));
      p2p.on('stream', (peer, stream) => {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.title = peer.id;
        video.srcObject = stream;
        $('videos').append(video);
      });
      p2p.on('error', (error) => log(`Erro: ${error.message}`));
      await p2p.join($('room').value);
      $('status').value = `Na room ${$('room').value}`;
    } catch (error) {
      $('status').value = 'Falha ao conectar';
      log(`Erro ao conectar: ${error.message}`);
    }
  };

  $('send').onclick = () => p2p?.broadcast($('message').value);
  $('send-file').onclick = async () => {
    const file = $('file').files[0];
    if (!file || !p2p) return;
    for (const peer of p2p.peers) await p2p.sendFile(peer, file);
  };
  $('camera').onclick = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    p2p?.addStream(stream);
    const video = document.createElement('video');
    video.autoplay = video.muted = video.playsInline = true;
    video.srcObject = stream;
    $('videos').prepend(video);
  };
})();
