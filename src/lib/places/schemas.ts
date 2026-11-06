import { z } from "zod";

/**
 * Validation rules for Google Places data that more than one module needs: the project
 * form and both /api/places routes. Rules used in one place stay next to that place.
 */

/** Place IDs are URL-safe text, e.g. "ChIJN1t_tDeuEmsRUsoyG83frY4". */
export const placeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,300}$/);

/** Autocomplete session token: a UUID the browser makes for one search. */
export const sessionTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{1,36}$/);
