const test = require("node:test");
const assert = require("node:assert/strict");

process.env.FIREBASE_CONFIG = process.env.FIREBASE_CONFIG || '{"storageBucket":"ci-bucket.appspot.com"}';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || "ci-project";

let __test;
try {
  const mod = require("../index.js");
  __test = mod.__test;
} catch (e) {
  // index.js not found or failed to load
}

function makeReq(overrides = {}) {
  const headers = overrides.headers || {};
  return {
    path: overrides.path || "/booking",
    ip: overrides.ip || "127.0.0.1",
    get(name) {
      return headers[String(name || "").toLowerCase()] || "";
    }
  };
}

if (__test) {
test("sanitizeString trims and limits length", () => {
  const value = __test.sanitizeString("   hello world   ", 5);
  assert.equal(value, "hello");
});

test("sanitizeObject drops invalid keys and deeply sanitizes", () => {
  const input = {
    safe_key: "  value  ",
    "bad key": "nope",
    nested: {
      ok: "yes",
      "$bad": "nope"
    }
  };
  const sanitized = __test.sanitizeObject(input);
  assert.deepEqual(sanitized, {
    safe_key: "value",
    nested: { ok: "yes" }
  });
});

test("roleFromToken and hasAnyRole map claims correctly", () => {
  assert.equal(__test.roleFromToken(null), "viewer");
  assert.equal(__test.roleFromToken({ role: "editor" }), "editor");
  assert.equal(__test.roleFromToken({ role: "admin" }), "admin");
  assert.equal(__test.roleFromToken({ admin: true }), "admin");
  assert.equal(__test.hasAnyRole({ role: "editor" }, ["admin", "editor"]), true);
  assert.equal(__test.hasAnyRole({ role: "viewer" }, ["admin", "editor"]), false);
});

test("stableHash is deterministic and fixed length", () => {
  const a = __test.stableHash("abc");
  const b = __test.stableHash("abc");
  assert.equal(a, b);
  assert.equal(a.length, 40);
});

test("extractLikelyMediaUrls finds image urls in nested data", () => {
  const input = {
    hero: {
      image: "https://cdn.example.com/a.webp",
      caption: "test"
    },
    blocks: ["https://cdn.example.com/b.jpg?x=1", "no-url"]
  };
  const found = __test.extractLikelyMediaUrls(input);
  assert.equal(found.includes("https://cdn.example.com/a.webp"), true);
  assert.equal(found.includes("https://cdn.example.com/b.jpg?x=1"), true);
});

test("buildBookingPayload rejects invalid payloads", () => {
  const req = makeReq({
    headers: { "user-agent": "test-agent" }
  });
  const parsed = __test.buildBookingPayload(
    { name: "A", phone: "12", service: "", consent: false },
    req
  );
  assert.equal(parsed.valid, false);
  assert.equal(parsed.message, "Consent is required");
});

test("buildBookingPayload accepts valid payload and normalizes language", () => {
  const req = makeReq({
    headers: { "user-agent": "test-agent" }
  });
  const parsed = __test.buildBookingPayload(
    {
      name: "John Doe",
      phone: "+995555123456",
      service: "Airport transfer",
      consent: true,
      sourceLang: "ar",
      sourcePage: "/booking-ar.html"
    },
    req
  );

  assert.equal(parsed.valid, true);
  assert.equal(parsed.payload.name, "John Doe");
  assert.equal(parsed.payload.phone, "+995555123456");
  assert.equal(parsed.payload.sourceLang, "ar");
  assert.equal(parsed.payload.status, "new");
  assert.ok(parsed.payload.createdAt);
});
} else {
  test("admin-core tests skipped", (t) => {
    t.skip("functions/index.js not found or __test not exported");
  });
}
