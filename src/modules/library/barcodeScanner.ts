type Detection = { rawValue?: string };
type Detector = { detect(source: CanvasImageSource): Promise<Detection[]> };
type DetectorConstructor = {
  new(options: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

const unsupported = 'Barcode scanning is not supported in this browser. Enter the ISBN above.';
const unavailable = 'Camera access was unavailable. Enter the ISBN above.';

/** Own one camera session. Every asynchronous boundary must respect cancellation. */
export function startBarcodeScan(video: HTMLVideoElement, onCode: (code: string) => void, onMessage: (message: string) => void) {
  let active = true;
  let stream: MediaStream | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const release = () => {
    clearTimeout(timer);
    stream?.getTracks().forEach(track => track.stop());
    stream = undefined;
    video.srcObject = null;
  };
  const stop = () => { active = false; release(); };
  const run = async () => {
    const Constructor = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    let detector: Detector;
    try {
      if (!Constructor || !navigator.mediaDevices?.getUserMedia ||
          (Constructor.getSupportedFormats && !(await Constructor.getSupportedFormats()).includes('ean_13'))) {
        if (active) onMessage(unsupported);
        return;
      }
      if (!active) return;
      detector = new Constructor({ formats: ['ean_13'] });
    } catch { if (active) onMessage(unsupported); return; }
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!active) { next.getTracks().forEach(track => track.stop()); return; }
      stream = next;
      video.srcObject = next;
      await video.play();
      if (!active) return;
      const scan = async () => {
        if (!active) return;
        try {
          const results = await detector.detect(video);
          if (!active) return;
          const code = results.map(result => result.rawValue?.replace(/\D/g, '')).find(value => value && /^(978|979)\d{10}$/.test(value));
          if (code) { stop(); onCode(code); return; }
        } catch { /* A frame may not be decodable yet. */ }
        if (active) timer = setTimeout(scan, 250);
      };
      void scan();
    } catch {
      if (active) { stop(); onMessage(unavailable); }
    }
  };
  void run();
  return stop;
}
