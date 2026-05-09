interface ToastEntry {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

class ToastStore {
  toasts = $state<ToastEntry[]>([]);
  private nextId = 1;

  show(text: string, kind: ToastEntry['kind'] = 'info') {
    const id = this.nextId++;
    this.toasts = [...this.toasts, { id, text, kind }];
    setTimeout(() => this.dismiss(id), 3500);
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export const toastStore = new ToastStore();
