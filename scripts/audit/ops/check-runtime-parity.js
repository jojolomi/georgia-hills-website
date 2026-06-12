const expectedNodeMajor = Number(process.env.EXPECTED_NODE_MAJOR || "20");
const required = String(process.env.REQUIRED_ENV_KEYS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const environment = process.env.GH_ENVIRONMENT || "unknown";

let passed = true;
const nodeMajor = Number(process.versions.node.split(".")[0]);

if (!Number.isFinite(nodeMajor) || nodeMajor !== expectedNodeMajor) {
  console.error(
    `✖ Node runtime mismatch for ${environment}: expected ${expectedNodeMajor}, got ${nodeMajor}`
  );
  passed = false;
}

for (const key of required) {
  if (!process.env[key] || !String(process.env[key]).trim()) {
    console.error(`✖ Missing required environment key: ${key}`);
    passed = false;
  }
}

if (passed) {
  console.log(`✔ runtime parity checks passed for ${environment}`);
} else {
  process.exit(1);
}
