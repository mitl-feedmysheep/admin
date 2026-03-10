import { vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: createPrismaMock(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    })
  ),
}));

function createPrismaMock() {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === "$transaction") {
        return vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
          return fn(new Proxy({}, handler));
        });
      }
      if (typeof prop === "string" && !prop.startsWith("_")) {
        return new Proxy(
          {},
          {
            get(_t, method) {
              const key = `${String(prop)}.${String(method)}`;
              if (!mockStore.has(key)) {
                mockStore.set(key, vi.fn());
              }
              return mockStore.get(key);
            },
          }
        );
      }
      return undefined;
    },
  };

  return new Proxy({}, handler);
}

const mockStore = new Map<string, ReturnType<typeof vi.fn>>();

export function getPrismaMock(model: string, method: string) {
  const key = `${model}.${method}`;
  if (!mockStore.has(key)) {
    mockStore.set(key, vi.fn());
  }
  return mockStore.get(key)!;
}

export function resetPrismaMocks() {
  mockStore.forEach((mock) => mock.mockReset());
}
