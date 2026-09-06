import { newId } from './ids';

const DEVICE_KEY = 'kaizen:device-id';

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = newId();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

