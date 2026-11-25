// @vitest-environment node
import { describe, expect, it } from "vitest";

import { isPublicAddress } from "./public-address";

describe("isPublicAddress", () => {
  it("lets public addresses through", () => {
    expect(isPublicAddress("93.184.215.14")).toBe(true);
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });

  it("stops loopback, private and link-local addresses", () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "172.20.0.5", "192.168.1.1", "169.254.169.254", "0.0.0.0"]) {
      expect(isPublicAddress(address)).toBe(false);
    }
    for (const address of ["::1", "::", "fd12:3456::1", "fe80::1", "ff02::1"]) {
      expect(isPublicAddress(address)).toBe(false);
    }
  });

  it("sees through IPv4 addresses wrapped in IPv6", () => {
    expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicAddress("::ffff:a9fe:a9fe")).toBe(false); // 169.254.169.254
    expect(isPublicAddress("64:ff9b::a00:1")).toBe(false); // 10.0.0.1
    expect(isPublicAddress("::ffff:8.8.8.8")).toBe(true);
  });

  it("refuses anything that is not an IP address", () => {
    expect(isPublicAddress("localhost")).toBe(false);
    expect(isPublicAddress("")).toBe(false);
  });
});
