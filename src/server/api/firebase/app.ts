import { credential } from "firebase-admin";
import { getApp, initializeApp, getApps } from "firebase-admin/app";
import { env } from "~/env.mjs";

if (getApps().length === 0) {
  initializeApp(
    {
      credential: credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    },
    "server"
  );
}

/**
 * The firebase-admin app instance.
 *
 * @see https://firebase.google.com/docs/admin/setup#initialize-sdk
 */
const serverApp = getApp("server");

export { serverApp };
