import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONSENT_LIFETIME, createAnalyticsController, measurementId, parseConsent,
} from "../src/lib/analytics-consent";

test("only current, unexpired boolean consent for the configured property is trusted", () => {
  const now = 1000;
  const preference = { analytics: true, measurementId: "G-TEST123", expiresAt: now + CONSENT_LIFETIME };
  const read = (value: unknown, id = "G-TEST123") => parseConsent(JSON.stringify(value), id, now);
  assert.deepEqual(read(preference), preference);
  assert.equal(read({ ...preference, analytics: false })?.analytics, false);
  for (const value of [null, true, {}, { ...preference, analytics: "true" },
    { ...preference, expiresAt: now }, { ...preference, expiresAt: now + CONSENT_LIFETIME + 1 }]) {
    assert.equal(read(value), null);
  }
  assert.equal(parseConsent("broken", "G-TEST123", now), null);
  assert.equal(read(preference, "G-OTHER"), null);
  assert.equal(read({ ...preference, measurementId: "" }), null, "Activating GA requires fresh consent");
  assert.equal(measurementId(undefined), "");
  assert.equal(measurementId("UA-123"), "");
  assert.equal(measurementId('G-123<script>'), "");
  assert.equal(measurementId(" G-TEST123 "), "G-TEST123");
});

test("tracking stays blocked until opt-in, loads once, and stops on withdrawal", (t) => {
  const browser: Record<string, unknown> = {};
  const scripts: { src: string; async: boolean }[] = [];
  const deleted: string[] = [];
  const documentMock = {
    get cookie() { return "_ga=one; _ga_TEST123=two; essential=keep"; },
    set cookie(value: string) { deleted.push(value); },
    createElement: () => ({}),
    head: { appendChild: (script: { src: string; async: boolean }) => scripts.push(script) },
  };
  for (const [key, value] of Object.entries({ window: browser, document: documentMock, location: { hostname: "www.globi-vulkan.ch" } })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  createAnalyticsController("")(true);
  createAnalyticsController("invalid")(true);
  assert.equal(scripts.length, 0);
  assert.equal(browser.dataLayer, undefined);
  const apply = createAnalyticsController("G-TEST123");
  apply(false);
  assert.equal(scripts.length, 0);
  assert.equal(browser.dataLayer, undefined, "Denial does not even create a Google queue");
  apply(true);
  apply(true);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, "https://www.googletagmanager.com/gtag/js?id=G-TEST123");
  assert.equal(scripts[0].async, true);
  const commands = () => (browser.dataLayer as IArguments[]).map((args) => Array.from(args));
  assert.deepEqual(commands().slice(0, 2).map((args) => args.slice(0, 2)), [["consent", "default"], ["consent", "update"]]);
  const granted = commands()[1][2] as Record<string, string>;
  assert.equal(granted.analytics_storage, "granted");
  assert.equal(granted.ad_storage, "denied");
  assert.equal(granted.ad_user_data, "denied");
  assert.equal(granted.ad_personalization, "denied");
  assert.equal(commands().filter((args) => args[0] === "config").length, 1);
  apply(false);
  assert.equal(browser["ga-disable-G-TEST123"], true, "Blocks even if opt-out races the script download");
  assert.equal((commands().at(-1)![2] as Record<string, string>).analytics_storage, "denied");
  assert.ok(deleted.some((cookie) => cookie.includes("domain=globi-vulkan.ch")));
  assert.ok(deleted.every((cookie) => cookie.startsWith("_ga")));
  apply(true);
  assert.equal(browser["ga-disable-G-TEST123"], false);
  assert.equal(scripts.length, 1, "Reaccepting never loads a duplicate tag");
});
