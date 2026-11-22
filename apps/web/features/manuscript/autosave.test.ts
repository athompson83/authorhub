import { expect, it } from "vitest";
import { Autosave } from "./autosave";
it("serializes edits made during a save using the returned version", async () => {
  let resolve!: (value: number) => void;
  const calls: unknown[] = [];
  const queue = new Autosave<string>(
    1,
    async (value, version) => {
      calls.push([value, version]);
      if (value === "first")
        return new Promise<number>((r) => {
          resolve = r;
        });
      return 3;
    },
    () => {},
  );
  queue.enqueue("first");
  const first = queue.flush();
  queue.enqueue("second");
  await queue.flush();
  expect(calls).toEqual([["first", 1]]);
  resolve(2);
  await first;
  expect(calls).toEqual([
    ["first", 1],
    ["second", 2],
  ]);
  expect(queue.dirty).toBe(false);
});
it("retains the newest edit on failure and retries without skipping a version", async () => {
  let fail = true;
  const calls: unknown[] = [];
  const queue = new Autosave<string>(
    5,
    async (value, version) => {
      calls.push([value, version]);
      if (fail) throw new Error("offline");
      return 6;
    },
    () => {},
  );
  queue.enqueue("draft");
  await queue.flush();
  expect(queue.dirty).toBe(true);
  queue.enqueue("new draft");
  await queue.flush();
  expect(calls).toHaveLength(1);
  fail = false;
  queue.retry();
  await new Promise((r) => setTimeout(r, 0));
  expect(calls).toEqual([
    ["draft", 5],
    ["new draft", 5],
  ]);
  expect(queue.dirty).toBe(false);
});
it("keeps the error and recovery controls visible when typing after a failed save", async () => {
  const states: string[] = [];
  const queue = new Autosave<string>(
    1,
    async () => {
      throw new Error("offline");
    },
    (state) => states.push(state),
  );
  queue.enqueue("draft");
  await queue.flush();
  queue.enqueue("continued draft");
  expect(states.at(-1)).toBe("error");
  expect(queue.dirty).toBe(true);
});
