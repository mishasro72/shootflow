import { describe, expect, it } from "vitest";
import {
  hexColorSchema,
  imageCardSchema,
  imageMeta,
  linkMeta,
  locationCardSchema,
  paletteColors,
  paletteSchema,
  placeMeta,
  titleFromFileName,
  updateCardSchema,
} from "./schemas";

describe("board schemas", () => {
  it("accepts six-digit colours and normalises them", () => {
    expect(hexColorSchema.parse(" #E8DCC8 ")).toBe("#e8dcc8");
    expect(hexColorSchema.safeParse("#fff").success).toBe(false);
    expect(hexColorSchema.safeParse("red").success).toBe(false);
  });

  it("keeps a palette between one and eight colours", () => {
    expect(paletteSchema.safeParse([]).success).toBe(false);
    expect(paletteSchema.safeParse(Array(8).fill("#000000")).success).toBe(true);
    expect(paletteSchema.safeParse(Array(9).fill("#000000")).success).toBe(false);
  });

  it("reads colours from a payload and ignores junk", () => {
    expect(paletteColors({ colors: ["#112233", "#445566"] })).toEqual(["#112233", "#445566"]);
    expect(paletteColors({ colors: ["nope"] })).toEqual([]);
    expect(paletteColors(null)).toEqual([]);
    expect(paletteColors("text")).toEqual([]);
  });

  it("limits titles and notes", () => {
    const id = "6f1c2a7d-3b8e-4f6a-8c5d-7e9b1a3c5e7f";
    expect(updateCardSchema.safeParse({ id, title: "x".repeat(200), body: null }).success).toBe(true);
    expect(updateCardSchema.safeParse({ id, title: "x".repeat(201), body: null }).success).toBe(false);
    expect(updateCardSchema.safeParse({ id, title: "", body: "y".repeat(4001) }).success).toBe(false);
  });

  it("accepts a photo card made of two uploads, within the board's size", () => {
    const card = {
      projectId: "6f1c2a7d-3b8e-4f6a-8c5d-7e9b1a3c5e7f",
      parentId: null,
      imageId: "7f1c2a7d-3b8e-4f6a-8c5d-7e9b1a3c5e7f",
      thumbId: "8f1c2a7d-3b8e-4f6a-8c5d-7e9b1a3c5e7f",
      title: "Window light",
      width: 2048,
      height: 1365,
      palette: ["#112233"],
    };
    expect(imageCardSchema.safeParse(card).success).toBe(true);
    expect(imageCardSchema.safeParse({ ...card, width: 4000 }).success).toBe(false);
    expect(imageCardSchema.safeParse({ ...card, palette: Array(9).fill("#000000") }).success).toBe(false);
    expect(imageCardSchema.safeParse({ ...card, sourceFileId: card.imageId }).success).toBe(true);
    expect(imageCardSchema.safeParse({ ...card, sourceFileId: "file-1" }).success).toBe(false);
  });

  it("reads a photo's size and colours, dropping broken colours", () => {
    expect(imageMeta({ width: 400, height: 300, palette: ["#aabbcc"] })).toEqual({
      width: 400,
      height: 300,
      palette: ["#aabbcc"],
    });
    expect(imageMeta({ width: 400, height: 300, palette: "junk" })).toEqual({ width: 400, height: 300, palette: [] });
    expect(imageMeta({})).toBeNull();
  });

  it("names a photo card after its file", () => {
    expect(titleFromFileName("IMG_2041.HEIC")).toBe("IMG_2041");
    expect(titleFromFileName("look 1.final.jpeg")).toBe("look 1.final");
    expect(titleFromFileName("noext")).toBe("noext");
  });

  it("reads a link card's payload only once it has an address", () => {
    expect(linkMeta({ url: "https://a.com/", site: "a.com", description: 5 })).toEqual({
      url: "https://a.com/",
      site: "a.com",
      description: null,
    });
    expect(linkMeta({})).toBeNull();
  });

  it("reads a place card's payload, with or without a Google place", () => {
    const synced = "2026-11-25T00:00:00Z";
    const zone = "America/New_York";
    expect(placeMeta({ place_id: "ChIJ1", lat: 35.7, lng: -78.6, synced_at: synced, timezone: zone })).toEqual({
      placeId: "ChIJ1",
      lat: 35.7,
      lng: -78.6,
      syncedAt: synced,
      timeZone: zone,
    });
    expect(placeMeta({})).toEqual({ placeId: null, lat: null, lng: null, syncedAt: null, timeZone: null });
    expect(placeMeta(null)).toEqual({ placeId: null, lat: null, lng: null, syncedAt: null, timeZone: null });
    expect(placeMeta({ lat: "35" }).lat).toBeNull();
  });

  it("keeps, replaces or unlinks the place of a place card", () => {
    const id = "6f1c2a7d-3b8e-4f6a-8c5d-7e9b1a3c5e7f";
    const base = { id, name: "Dix Park", address: null };
    const place = { placeId: "ChIJ-e2e", lat: 35.77, lng: -78.66, timeZone: "America/New_York" };
    expect(locationCardSchema.safeParse(base).success).toBe(true);
    expect(locationCardSchema.safeParse({ ...base, place: null }).success).toBe(true);
    expect(locationCardSchema.safeParse({ ...base, place }).success).toBe(true);
    expect(locationCardSchema.safeParse({ ...base, place: { ...place, lat: 91 } }).success).toBe(false);
    expect(locationCardSchema.safeParse({ ...base, place: { ...place, placeId: "bad id!" } }).success).toBe(false);
  });
});
