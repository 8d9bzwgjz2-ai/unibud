/** ML runtime for Looks/Lens. CSS is never reported as tracking. */

export type MLState = "SUPPORTED" | "INITIALIZING" | "UNAVAILABLE" | "PERMISSION_REQUIRED" | "FAILED";

export type MLFeature =
  | "face-detect"
  | "face-landmarks"
  | "face-mesh"
  | "face-track"
  | "person-seg"
  | "bg-seg"
  | "pose"
  | "object"
  | "person-clone";

export type FaceBox = { x: number; y: number; width: number; height: number };

export type MLCap = {
  feature: MLFeature;
  state: MLState;
  runtime: string;
  need?: string;
};

type Detector = { detect: (s: ImageBitmapSource) => Promise<{ boundingBox: DOMRectReadOnly }[]> };

function faceDetectorCap(): MLCap {
  const Ctor = (window as unknown as { FaceDetector?: new (o?: { fastMode?: boolean }) => Detector }).FaceDetector;
  if (!Ctor) {
    return {
      feature: "face-detect",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "Browser FaceDetector or MediaPipe Face Landmarker WASM",
    };
  }
  return { feature: "face-detect", state: "SUPPORTED", runtime: "shape-detection" };
}

export function inspectML(): MLCap[] {
  const gpu = typeof navigator !== "undefined" && "gpu" in navigator;
  const wasm = typeof WebAssembly !== "undefined";
  return [
    faceDetectorCap(),
    {
      feature: "face-landmarks",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "MediaPipe Face Landmarker (WASM). Not bundled.",
    },
    {
      feature: "face-mesh",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "MediaPipe Face Landmarker mesh output",
    },
    {
      feature: "face-track",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "Temporal face landmarker",
    },
    {
      feature: "person-seg",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "MediaPipe Image Segmenter",
    },
    {
      feature: "bg-seg",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "Person/background segmenter",
    },
    {
      feature: "pose",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "MediaPipe Pose Landmarker",
    },
    {
      feature: "object",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "Object detector WASM",
    },
    {
      feature: "person-clone",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "Person mask + temporal placement. Frame-split Looks are not person clone.",
    },
    {
      feature: "face-landmarks",
      state: wasm ? "UNAVAILABLE" : "FAILED",
      runtime: gpu ? "wasm+webgpu" : wasm ? "wasm-present" : "wasm-missing",
      need: "MediaPipe tasks-vision package + model files",
    },
  ];
}

/** Probe MediaPipe from CDN. Never throws into the camera. */
export async function probeMediaPipe(): Promise<MLCap> {
  try {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.js", {
      method: "HEAD",
      mode: "no-cors",
      signal: ctrl.signal,
    });
    window.clearTimeout(t);
    void res;
    return {
      feature: "face-landmarks",
      state: "UNAVAILABLE",
      runtime: "mediapipe-cdn-reachable-unbundled",
      need: "tasks-vision WASM + model are not in this app bundle. CDN reachability ≠ loaded landmarker.",
    };
  } catch {
    return {
      feature: "face-landmarks",
      state: "UNAVAILABLE",
      runtime: "none",
      need: "MediaPipe could not be reached. Camera keeps working without it.",
    };
  }
}

export function createFaceBoxes() {
  const cap = faceDetectorCap();
  const Ctor = (window as unknown as { FaceDetector?: new (o?: { fastMode?: boolean }) => Detector }).FaceDetector;
  if (!Ctor) {
    return {
      cap,
      detect: async (_s: HTMLVideoElement): Promise<FaceBox[]> => [],
    };
  }
  const det = new Ctor({ fastMode: true });
  return {
    cap: { ...cap, state: "SUPPORTED" as const },
    detect: async (source: HTMLVideoElement): Promise<FaceBox[]> => {
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
