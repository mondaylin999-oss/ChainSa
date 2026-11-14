import directory from "./township-points.json";

/** Trusted server-side coordinates derived from the bundled township polygons. */
export function getTownshipPoint(id: string, regionId: string) {
  return directory.townships.find(township => township.id === id && township.regionId === regionId);
}
