/** Face runtime. Uses the browser FaceDetector when present. MediaPipe/WebGPU can implement the same shape later. */

export type FaceBox = { x: number; y: number; width: number; height: number };

export type FaceRuntime = {
  id: string;
  ready: boolean;
  detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<FaceBox[]>;
};

type Detector = { detect: (s: ImageBitmapSource) => Promise<{ boundingBox: DOMRectReadOnly }[]> };

export function createFaceRuntime(): FaceRuntime {
  const Ctor = (window as unknown as { FaceDetector?: new (o?: { fastMode?: boolean }) => Detector }).FaceDetector;
  if (!Ctor) {
    return {
      id: "none",
      ready: false,
      detect: async () => [],
    };
  }
  const det = new Ctor({ fastMode: true });
  return {
    id: "shape-detection",
    ready: true,
    detect: async (source) => {
      try {
        const hits = await det.detect(source);
        return hits.map((h) => ({
          x: h.boundingBox.x,
          y: h.boundingBox.y,
          width: h.boundingBox.width,
          height: h.boundingBox.height,
        }));
      } catch {
        return [];
      }
    },
  };
}

export function faceRuntimeNeeded() {
  return "A MediaPipe Tasks Vision or WebGPU face-landmarker runtime. The browser FaceDetector is used when the device exposes it.";
}
