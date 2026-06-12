#!/usr/bin/env node
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function normalizeEmail(input) {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return "";
  return value.replace(",com", ".com");
}

function parseArgs(argv) {
  const args = { email: "", projectId: "", serviceAccountPath: "" };
  const tokens = argv.slice(2);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!args.email && token && !token.startsWith("--")) {
      args.email = token;
      continue;
    }
    if (token === "--project" || token === "--projectId") {
      args.projectId = String(tokens[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (token === "--service-account") {
      args.serviceAccountPath = String(tokens[i + 1] || "").trim();
      i += 1;
    }
  }
  return args;
}

function resolveCredentialAndProject(args) {
  const projectId =
    args.projectId ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    "";

  const explicitPath =
    args.serviceAccountPath ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    "";

  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";

  if (inlineJson) {
    const parsed = JSON.parse(inlineJson);
    return {
      credential: admin.credential.cert(parsed),
      projectId: projectId || parsed.project_id || ""
    };
  }

  if (explicitPath) {
    const absPath = path.resolve(explicitPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Service account file not found: ${absPath}`);
    }
    const json = JSON.parse(fs.readFileSync(absPath, "utf8"));
    return {
      credential: admin.credential.cert(json),
      projectId: projectId || json.project_id || ""
    };
  }

  return {
    credential: admin.credential.applicationDefault(),
    projectId
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const rawEmail = args.email;
  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes("@")) {
    throw new Error("Usage: node scripts/provision-owner-admin.js <owner-email> [--project <project-id>] [--service-account <path-to-json>]");
  }

  if (!admin.apps.length) {
    const init = resolveCredentialAndProject(args);
    admin.initializeApp({
      credential: init.credential,
      projectId: init.projectId || undefined
    });
  }

  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, {
    admin: true,
    role: "admin"
  });

  console.log(`Admin claims assigned for ${email}`);
  console.log(`OWNER_UID=${user.uid}`);
  console.log("");
  console.log("Next: set Cloud Functions env ADMIN_OWNER_UID to this UID.");
  console.log("Example (Firebase Functions v2 params/secrets/environment):");
  console.log(`ADMIN_OWNER_UID=${user.uid}`);
}

main().catch((error) => {
  const message = String(error.message || error);
  console.error(message);
  if (message.includes("metadata.google.internal") || message.includes("Failed to determine project ID")) {
    console.error("");
    console.error("Set explicit credentials, then run:");
    console.error('PowerShell example:');
    console.error('$env:GOOGLE_APPLICATION_CREDENTIALS=\"C:\\\\path\\\\service-account.json\"');
    console.error('$env:GCLOUD_PROJECT=\"your-project-id\"');
    console.error("npm --prefix functions run owner:provision -- menaashraf931931@gmail.com");
  }
  process.exit(1);
});
