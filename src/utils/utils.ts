export function assert(value: boolean, error?: string): asserts value {
  if (!value) throw new Error(error ?? "Assert Error");
}
