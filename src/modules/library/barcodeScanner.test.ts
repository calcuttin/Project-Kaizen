import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { startBarcodeScan } from './barcodeScanner';

const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] } as unknown as MediaStream;
const detect = vi.fn();
const media = vi.fn();
let video: HTMLVideoElement;
let stop: (() => void) | undefined;
const code = vi.fn(), message = vi.fn();
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
class Detector { detect = detect; static getSupportedFormats = vi.fn(); }
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  video = { srcObject: null, play: vi.fn().mockResolvedValue(undefined) } as unknown as HTMLVideoElement;
  detect.mockResolvedValue([]); media.mockResolvedValue(stream); Detector.getSupportedFormats.mockResolvedValue(['ean_13']);
  vi.stubGlobal('window', { BarcodeDetector: Detector });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: media } });
});
afterEach(() => { stop?.(); stop = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
it('handles unsupported formats and constructor errors without requesting a camera', async () => {
  Detector.getSupportedFormats.mockResolvedValue(['qr_code']);
  stop = startBarcodeScan(video, code, message); await flush();
  expect(message).toHaveBeenCalledWith(expect.stringContaining('not supported')); expect(media).not.toHaveBeenCalled();
  vi.stubGlobal('window', { BarcodeDetector: class { constructor() { throw new Error('Unsupported'); } } });
  stop = startBarcodeScan(video, code, message); await flush();
  expect(message).toHaveBeenCalledTimes(2); expect(media).not.toHaveBeenCalled();
});
it('releases a camera granted after cancellation without attaching it', async () => {
  let grant!: (stream: MediaStream) => void;
  media.mockReturnValue(new Promise(resolve => { grant = resolve; }));
  stop = startBarcodeScan(video, code, message); await flush(); stop(); grant(stream); await flush();
  expect(track.stop).toHaveBeenCalledTimes(1); expect(video.srcObject).toBeNull(); expect(video.play).not.toHaveBeenCalled();
});
it('ignores a detector result that arrives after cancellation', async () => {
  let finish!: (results: { rawValue: string }[]) => void;
  detect.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  stop = startBarcodeScan(video, code, message); await flush(); stop(); finish([{ rawValue: '9780141439518' }]); await flush();
  expect(code).not.toHaveBeenCalled(); expect(track.stop).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
});
it('stops the stream on playback failure and leaves manual ISBN entry available', async () => {
  vi.mocked(video.play).mockRejectedValue(new Error('Playback blocked'));
  stop = startBarcodeScan(video, code, message); await flush();
  expect(track.stop).toHaveBeenCalledTimes(1); expect(video.srcObject).toBeNull();
  expect(message).toHaveBeenCalledWith(expect.stringContaining('Camera access was unavailable')); expect(detect).not.toHaveBeenCalled();
});
it('releases the stream before returning a matching ISBN from all detected barcodes', async () => {
  detect.mockResolvedValue([{ rawValue: '0123456789012' }, { rawValue: '9780141439518' }]);
  code.mockImplementation(() => { expect(track.stop).toHaveBeenCalledTimes(1); expect(video.srcObject).toBeNull(); });
  stop = startBarcodeScan(video, code, message); await flush();
  expect(code).toHaveBeenCalledWith('9780141439518'); expect(vi.getTimerCount()).toBe(0);
});
it('retries undecodable frames but cancels their timer on close', async () => {
  detect.mockRejectedValue(new Error('No frame'));
  stop = startBarcodeScan(video, code, message); await flush();
  await vi.advanceTimersByTimeAsync(250); expect(detect).toHaveBeenCalledTimes(2);
  stop(); await vi.advanceTimersByTimeAsync(1000); expect(detect).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
});
it('reports permission rejection without a dangling timer or scan', async () => {
  media.mockRejectedValue(new Error('Denied'));
  stop = startBarcodeScan(video, code, message); await flush();
  expect(message).toHaveBeenCalledWith(expect.stringContaining('unavailable')); expect(detect).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});
