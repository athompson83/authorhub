/** Serializes saves and coalesces edits made while a request is in flight. */
export class Autosave<T> {
  private pending: T | undefined;
  private running = false;
  private stopped = false;
  private lastError: unknown;
  constructor(
    private version: number,
    private save: (value: T, version: number) => Promise<number>,
    private status: (
      state: "saving" | "saved" | "error",
      error?: unknown,
    ) => void,
  ) {}
  enqueue(value: T) {
    this.pending = value;
    this.status(this.stopped ? "error" : "saving", this.lastError);
  }
  get dirty() {
    return this.pending !== undefined || this.running;
  }
  async flush() {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      while (this.pending !== undefined) {
        const value = this.pending;
        this.pending = undefined;
        try {
          this.version = await this.save(value, this.version);
        } catch (error) {
          if (this.pending === undefined) this.pending = value;
          this.stopped = true;
          this.lastError = error;
          this.status("error", error);
          return;
        }
      }
      this.status("saved");
    } finally {
      this.running = false;
    }
  }
  retry() {
    this.stopped = false;
    void this.flush();
  }
}
