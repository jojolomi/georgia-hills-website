import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "../api/firebase";

export async function reauthenticateOwner(actionLabel) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }
  if (!user.email) {
    throw new Error("Owner account must have an email for re-authentication.");
  }

  const password = window.prompt(
    `Security check: re-enter your password to continue (${actionLabel}).`
  );

  if (password === null) {
    return { cancelled: true };
  }
  if (!password.trim()) {
    throw new Error("Password is required for this action.");
  }

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  return { cancelled: false };
}
