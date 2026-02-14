import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { useItemsQuery } from "./useItemsQuery";

const payload = {
  items: [],
  page: 1,
  page_size: 100,
  total: 0,
  total_pages: 1,
  has_next: false,
  has_prev: false,
  sort: "newest",
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    })
  );
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("changing filter triggers fetch without full page reload", async () => {
  const replaceStateSpy = vi.spyOn(window.history, "replaceState");
  const { result } = renderHook(() => useItemsQuery());

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

  await act(async () => {
    result.current.updateQuery({ q: "guitar" });
  });

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(replaceStateSpy).toHaveBeenCalled();
  expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1]?.[0]).toContain("q=guitar");
  expect(window.location.search).toContain("q=guitar");
});
