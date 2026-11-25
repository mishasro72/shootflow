// @vitest-environment node
import { describe, expect, it } from "vitest";

import { assertFetchable, UnsafeUrlError } from "./fetch-rules";

const check = (url: string) => () => assertFetchable(new URL(url));

describe("assertFetchable", () => {
  it("allows ordinary public pages", () => {
    expect(check("https://www.pinterest.com/pin/1")).not.toThrow();
    expect(check("http://example.com:80/")).not.toThrow();
    expect(check("https://93.184.215.14/")).not.toThrow();
  });

  it("refuses our own server, private networks and the cloud metadata service", () => {
    for (const url of [
      "http://localhost:3000/",
      "http://api.localhost/",
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.5/",
      "http://[::1]/",
      "http://[::ffff:127.0.0.1]/",
    ]) {
      expect(check(url), url).toThrow(UnsafeUrlError);
    }
  });

  it("refuses other ports, protocols and addresses with a login", () => {
    expect(check("http://example.com:8080/")).toThrow(UnsafeUrlError);
    expect(check("ftp://example.com/")).toThrow(UnsafeUrlError);
    expect(check("file:///etc/passwd")).toThrow(UnsafeUrlError);
    expect(check("https://user:pass@example.com/")).toThrow(UnsafeUrlError);
  });
});
