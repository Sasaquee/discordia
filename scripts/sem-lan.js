/* Finge que nao existe rede local: nenhum candidato "typ host" sai daqui, nem
   pelo trickle nem dentro do SDP (o iceCandidatePoolSize pre-junta candidatos e
   embute no proprio offer). Os dois lados so podem se achar pelo IP publico,
   que e a situacao de quem entra de fora. Precisa dos dois lados fazendo isso. */
(function () {
  const semHost = (sdp) => String(sdp).split(/\r?\n/)
    .filter((l) => !(/^a=candidate:/.test(l) && / typ host/.test(l)))
    .join('\r\n');
  const orig = send;
  window.send = function (m) {
    try {
      if (m && m.type === 'signal' && m.data) {
        if (m.data.candidate) {
          const c = m.data.candidate.candidate || '';
          if (/ typ host/.test(c)) return;
        }
        if (m.data.description && m.data.description.sdp) {
          m = JSON.parse(JSON.stringify(m));
          m.data.description.sdp = semHost(m.data.description.sdp);
        }
      }
    } catch {}
    return orig(m);
  };
  // e recusa candidato host que chegue do outro lado, caso ele nao filtre
  const addOrig = RTCPeerConnection.prototype.addIceCandidate;
  RTCPeerConnection.prototype.addIceCandidate = function (c) {
    if (c && c.candidate && / typ host/.test(c.candidate)) return Promise.resolve();
    return addOrig.apply(this, arguments);
  };
})();
