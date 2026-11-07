/** ML adapters. CSS Looks must not claim these. */

export type VisionKind = "face-box" | "face-mesh" | "person-seg" | "bg-seg" | "pose" | "object" | "clone-person";

export type VisionAdapter = {
  kind: VisionKind;
  id: string;
  ready: boolean;
  need?: string;
};

export function detectVision(): VisionAdapter[] {
  const FaceDetector = (window as unknown as { FaceDetector?: unknown }).FaceDetector;
  const webgpu = typeof navigator !== "undefined" && "gpu" in navigator;
  return [
    {
      kind: "face-box",
      id: FaceDetector ? "shape-detection" : "none",
      ready: Boolean(FaceDetector),
      need: FaceDetector ? undefined : "Browser FaceDetector or MediaPipe Face Landmarker",
    },
    {
      kind: "face-mesh",
      id: "none",
      ready: false,
      need: "MediaPipe Face Landmarker (WASM/WebGPU)",
    },
    {
      kind: "person-seg",
      id: "none",
      ready: false,
      need: "MediaPipe Image Segmenter or a WebGPU segmenter",
    },
    {
      kind: "bg-seg",
      id: "none",
      ready: false,
      need: "Person/background segmenter runtime",
    },
    {
      kind: "pose",
      id: "none",
      ready: false,
      need: "MediaPipe Pose Landmarker",
    },
    {
      kind: "object",
      id: "none",
      ready: false,
      need: "Object detector WASM/WebGPU",
    },
    {
      kind: "clone-person",
      id: "none",
      ready: false,
      need: "Person segmentation + tracking",
    },
    {
      kind: "face-box",
      id: webgpu ? "webgpu-available" : "webgpu-missing",
      ready: false,
      need: webgpu ? "A landmarker compiled for WebGPU" : "WebGPU on this device",
    },
  ];
}
