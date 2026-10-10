/** WebRTC call layer. Signaling is injected. Without it the peer stays in waiting-signal. */

export type IceJson = RTCIceCandidateInit;

export type SignalMsg =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "ice"; candidate: IceJson };

export type Signaling = {
  send: (msg: SignalMsg) => void | Promise<void>;
  subscribe: (fn: (msg: SignalMsg) => void) => () => void;
};

export type CallState = "idle" | "getting-media" | "waiting-signal" | "connecting" | "connected" | "failed" | "ended";

export function createPeer(local: MediaStream, signaling?: Signaling) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  local.getTracks().forEach((t) => pc.addTrack(t, local));
  let unsub: (() => void) | undefined;
  if (signaling) {
    pc.onicecandidate = (e) => {
      if (e.candidate) void signaling.send({ kind: "ice", candidate: e.candidate.toJSON() });
    };
    unsub = signaling.subscribe((msg) => {
      void (async () => {
        if (msg.kind === "offer") {
          await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (answer.sdp) void signaling.send({ kind: "answer", sdp: answer.sdp });
        }
        if (msg.kind === "answer" && msg.sdp) {
          await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
        }
        if (msg.kind === "ice") {
          await pc.addIceCandidate(msg.candidate).catch(() => {});
        }
      })();
    });
  }
  return {
    pc,
    async offer() {
      if (!signaling) return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (offer.sdp) await signaling.send({ kind: "offer", sdp: offer.sdp });
    },
    close() {
      unsub?.();
      pc.close();
    },
  };
}

export function signalingNeeded() {
  return "A UNIBUD call signaling service (offer/answer/ICE). STUN is present; TURN and a room server are not.";
}
