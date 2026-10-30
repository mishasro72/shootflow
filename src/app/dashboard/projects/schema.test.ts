import { describe, expect, it } from "vitest";

import { parseProjectForm, projectToFormValues, type ProjectFormValues } from "./schema";

const valid: ProjectFormValues = {
  title: "  Golden hour portraits ",
  shootDate: "2026-11-14",
  startTime: "17:00",
  endTime: "19:00",
  timezone: "America/New_York",
  locationName: "Dix Park",
  locationAddress: "",
  notes: "",
  retouchLimit: "10",
  clientLocale: "en",
  clientName: "Anna",
  clientEmail: "Anna@Example.com",
};

describe("parseProjectForm", () => {
  it("turns valid input into database rows", () => {
    const result = parseProjectForm(valid);
    expect(result).toEqual({
      ok: true,
      project: {
        title: "Golden hour portraits",
        shoot_start: "2026-11-14T22:00:00.000Z",
        shoot_end: "2026-11-15T00:00:00.000Z",
        timezone: "America/New_York",
        location_name: "Dix Park",
        location_address: null,
        notes: null,
        retouch_limit: 10,
        client_locale: "en",
      },
      client: { name: "Anna", email: "anna@example.com" },
    });
  });

  it("allows a draft with only a title", () => {
    const result = parseProjectForm({
      ...valid,
      shootDate: "",
      startTime: "",
      endTime: "",
      locationName: "",
      clientName: "",
      clientEmail: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.shoot_start).toBeNull();
      expect(result.client).toBeNull();
    }
  });

  it("reports a missing title", () => {
    expect(parseProjectForm({ ...valid, title: "   " })).toEqual({ ok: false, errors: { title: "required" } });
  });

  it("needs a start time when a date is set, and a date when a time is set", () => {
    expect(parseProjectForm({ ...valid, startTime: "", endTime: "" })).toEqual({
      ok: false,
      errors: { startTime: "required" },
    });
    expect(parseProjectForm({ ...valid, shootDate: "" })).toEqual({ ok: false, errors: { shootDate: "required" } });
  });

  it("rejects an end time before the start", () => {
    expect(parseProjectForm({ ...valid, endTime: "16:00" })).toEqual({
      ok: false,
      errors: { endTime: "endBeforeStart" },
    });
  });

  it("validates the retouch limit, email and time zone", () => {
    const result = parseProjectForm({ ...valid, retouchLimit: "abc", clientEmail: "not-an-email", timezone: "Mars/Base" });
    expect(result).toEqual({
      ok: false,
      errors: { retouchLimit: "invalid", clientEmail: "invalid", timezone: "invalid" },
    });
    expect(parseProjectForm({ ...valid, retouchLimit: "900" })).toEqual({
      ok: false,
      errors: { retouchLimit: "outOfRange" },
    });
  });

  it("needs a client name when an email is given", () => {
    expect(parseProjectForm({ ...valid, clientName: "" })).toEqual({ ok: false, errors: { clientName: "required" } });
  });
});

describe("projectToFormValues", () => {
  it("round-trips through parseProjectForm", () => {
    const parsed = parseProjectForm(valid);
    if (!parsed.ok) throw new Error("expected valid input");
    expect(projectToFormValues(parsed.project, parsed.client)).toEqual({
      ...valid,
      title: "Golden hour portraits",
      clientEmail: "anna@example.com",
    });
  });
});
