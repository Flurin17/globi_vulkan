import { test } from "node:test";
import assert from "node:assert/strict";
import { retailers } from "../src/data/retailers";
import source from "../src/data/retailer-map-source.json";
import { filterRetailers } from "../src/lib/retailers";

test("every directory retailer has its matched source position in Switzerland", () => {
  assert.equal(source.locations.length, 37);
  assert.equal(new Set(source.locations.map((location) => location.id)).size, 37);
  for (const retailer of retailers) {
    const match = source.locations.find((location) => location.id === retailer.id);
    assert.ok(match, `Missing source position for ${retailer.id}`);
    assert.deepEqual(retailer.coordinates, match.coordinates);
    const [latitude, longitude] = retailer.coordinates;
    assert.ok(latitude > 45.8 && latitude < 47.9);
    assert.ok(longitude > 5.9 && longitude < 10.5);
  }
});

test("filtered map data retains separate Wil dealers and the Frauenfeld location", () => {
  const wil = filterRetailers(retailers, "9500");
  assert.equal(wil.length, 2);
  assert.notDeepEqual(wil[0].coordinates, wil[1].coordinates);
  const felix = filterRetailers(retailers, "8500 Felix");
  assert.equal(felix.length, 1);
  assert.deepEqual(felix[0].coordinates, [47.5637524, 8.9085456]);
  assert.equal(filterRetailers(retailers, "no-such-retailer").length, 0);
});
