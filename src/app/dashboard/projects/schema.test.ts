import { describe, expect, it } from "vitest";

import { parseProjectForm, placeColumns, projectToFormValues, type ProjectFormValues } from "./schema";

const valid: ProjectFormValues = {
  title: "  Golden hour portraits ",
  shootDate: "2026-11-14",
  startTime: "17:00",
  endTime: "19:00",
  timezone: "America/New_York",
  locationName: "Dix Park",
  locationAddress: "",
  placeId: "",
  placeLat: "",
  placeLng: "",
  notes: "",
  retouchLimit: "10",
  clientLocale: "en",
  clientName: "Anna",
  clientEmail: "Anna@Example.com",
};

const picked = { placeId: "ChIJdixPark", placeLat: "35.7686", placeLng: "-78.6564" };

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
        google_place_id: null,
        notes: null,
        retouch_limit: 10,
        client_locale: "en",
      },
      client: { name: "Anna", email: "anna@example.com" },
      pickedCoords: null,
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
    const result = parseProjectForm({
      ...valid,
      retouchLimit: "abc",
      clientEmail: "not-an-email",
      timezone: "Mars/Base",
    });
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

  it("reads a picked place with its coordinates", () => {
    const result = parseProjectForm({ ...valid, ...picked });
    expect(result.ok && result.project.google_place_id).toBe("ChIJdixPark");
    expect(result.ok && result.pickedCoords).toEqual({ lat: 35.7686, lng: -78.6564 });
  });

  it("rejects broken place data", () => {
    expect(parseProjectForm({ ...valid, placeId: "../../x" })).toEqual({ ok: false, errors: { placeId: "invalid" } });
    expect(parseProjectForm({ ...valid, ...picked, placeLat: "91" })).toEqual({
      ok: false,
      errors: { placeLat: "invalid" },
    });
    expect(parseProjectForm({ ...valid, ...picked, placeLng: "" })).toEqual({
      ok: false,
      errors: { placeLat: "invalid" },
    });
    expect(parseProjectForm({ ...valid, ...picked, placeId: "" })).toEqual({
      ok: false,
      errors: { placeLat: "invalid" },
    });
  });
});

describe("placeColumns", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  const project = { google_place_id: "ChIJdixPark", location_name: "Dix Park" };

  it("clears everything from Google when there is no place", () => {
    expect(placeColumns({ google_place_id: null, location_name: "Studio" }, null, "ChIJold", now)).toEqual({
      location_map_url: null,
      location_lat: null,
      location_lng: null,
      place_synced_at: null,
    });
  });

  it("saves freshly picked coordinates with the sync time", () => {
    expect(placeColumns(project, { lat: 35.7686, lng: -78.6564 }, null, now)).toEqual({
      location_map_url: expect.stringContaining("query_place_id=ChIJdixPark"),
      location_lat: 35.7686,
      location_lng: -78.6564,
      place_synced_at: "2026-11-05T12:00:00.000Z",
    });
  });

  it("keeps saved coordinates when the place did not change", () => {
    expect(placeColumns(project, null, "ChIJdixPark", now)).toEqual({
      location_map_url: expect.stringContaining("query_place_id=ChIJdixPark"),
    });
  });

  it("drops coordinates of the old place when a new one came without them", () => {
    expect(placeColumns(project, null, "ChIJold", now)).toMatchObject({
      location_lat: null,
      location_lng: null,
      place_synced_at: null,
    });
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

  it("keeps the place but not the coordinates", () => {
    const parsed = parseProjectForm({ ...valid, ...picked });
    if (!parsed.ok) throw new Error("expected valid input");
    const values = projectToFormValues(parsed.project, parsed.client);
    expect(values.placeId).toBe("ChIJdixPark");
    expect(values.placeLat).toBe("");
  });
});
