/**
 * Safe localStorage wrapper that works in both server and client environments
 */

class SafeLocalStorage implements Storage {
  private isClient = typeof window !== 'undefined';
  private mockData: Record<string, string> = {};

  get length(): number {
    if (this.isClient && window.localStorage) {
      return window.localStorage.length;
    }
    return Object.keys(this.mockData).length;
  }

  clear(): void {
    if (this.isClient && window.localStorage) {
      window.localStorage.clear();
      return;
    }
    this.mockData = {};
  }

  getItem(key: string): string | null {
    if (this.isClient && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return this.mockData[key] ?? null;
  }

  key(index: number): string | null {
    if (this.isClient && window.localStorage) {
      return window.localStorage.key(index);
    }
    const keys = Object.keys(this.mockData);
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    if (this.isClient && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    delete this.mockData[key];
  }

  setItem(key: string, value: string): void {
    if (this.isClient && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    this.mockData[key] = value;
  }
}

export const safeLocalStorage = new SafeLocalStorage();
