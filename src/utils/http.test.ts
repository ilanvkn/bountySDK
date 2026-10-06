import { afterEach, describe, expect, it, vi } from "vitest";
import { httpRequest } from "./http";

describe("httpRequest JSON body serialization", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([false, 0, "", null, { taskId: "example" }, []])(
    "preserves the explicitly supplied JSON value %j",
    async (body) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await httpRequest("https://example.invalid/api/test", {
        method: "POST",
        body,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.invalid/api/test",
        expect.objectContaining({ body: JSON.stringify(body) })
      );
      expect(result).toEqual({ ok: true });
    }
  );

  it.each([{}, { body: undefined }])("omits an absent body (%j)", async (options) => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await httpRequest("https://example.invalid/api/test", options);

    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("body");
  });
});
