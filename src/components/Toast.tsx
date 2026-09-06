import { create } from 'zustand';
import { Sparkles } from 'lucide-react';

type ToastAction = { label: string; run: () => void };
interface ToastState { toasts: { id: number; text: string; action?: ToastAction }[]; push: (text: string, action?: ToastAction) => void }
let seq = 0;
export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (text, action) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, text, action }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), action ? 10000 : 2600);
  },
}));
export const toast = (text: string, action?: ToastAction) => useToast.getState().push(text, action);

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  return (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className="toast"><Sparkles />{t.text}{t.action && <button className="btn sm" onClick={() => { t.action?.run(); useToast.setState((state) => ({ toasts: state.toasts.filter((item) => item.id !== t.id) })); }}>{t.action.label}</button>}</div>)}
    </div>
  );
}
