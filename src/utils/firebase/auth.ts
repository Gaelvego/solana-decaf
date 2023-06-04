import {
  getAuth,
  type User as FirebaseUser,
  type UserCredential,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { clientApp } from "./app";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { z } from "zod";

const auth = getAuth(clientApp);

export const contactSchema = z.object({
  uid: z.string(),
  displayName: z.string(),
  email: z.string(),
  publicKey: z.string(),
});

export type ContactT = z.infer<typeof contactSchema>;

export const userSchema = z.object({
  uid: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  displayName: z.string(),
  photoURL: z.string(),
  createdAt: z.number(),
  publicKey: z.string(),
  contacts: z.array(contactSchema),
});

export type UserT = z.infer<typeof userSchema>;

const useAuthUser = (o?: {
  /**
   * Callback function to run only if the user is authenticated.
   *
   * @param u The authenticated user
   * @returns void
   */
  authenticatedCb?: (u: UserT) => void;
  /**
   * Callback function to run only if the user is not authenticated.
   * @returns void
   */
  unauthenticatedCb?: () => void;
}): [boolean, UserT | null, FirebaseUser | null] => {
  const db = getFirestore(clientApp);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserT | null>(null);

  const [authUser, authLoading] = useAuthState(auth);

  useEffect(() => {
    if (!loading && !user && o?.unauthenticatedCb) o?.unauthenticatedCb();
  }, [o, loading, user]);

  useEffect(() => {
    if (!loading && user && o?.authenticatedCb) o?.authenticatedCb(user);
  }, [o, loading, user]);

  // Update the user in Firestore
  useEffect(() => {
    const setUserData = (user: FirebaseUser) => {
      const userRef = doc(db, `users/${user.uid}`);
      const unsub = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          setLoading(false);

          const parsedUser = userSchema.safeParse(userDoc.data());

          if (parsedUser.success) {
            setUser(parsedUser.data);
          } else {
            setUser(null);
          }
        } else {
          const initialUser: UserT = {
            displayName: user.displayName || "",
            email: user.email || "",
            emailVerified: user.emailVerified,
            photoURL: user.photoURL || "",
            uid: user.uid,
            createdAt: Date.now(),
            publicKey: "",
            contacts: [],
          };

          void setDoc(userRef, initialUser, { merge: true });
          setLoading(false);
          setUser(initialUser);
        }
      });

      return unsub;
    };

    let unsubscribe: () => void = () => null;

    if (authLoading) {
      // Still loading
      setLoading(true);
    } else {
      if (authUser) {
        // Auth user found => set user data
        unsubscribe = setUserData(authUser);
      } else {
        // No auth user found => set user to null
        setUser(null);
        setLoading(false);
      }
    }

    return () => {
      unsubscribe();
    };
  }, [authLoading, authUser, db]);

  return [loading, user, authUser || null];
};

type provider = "google";

const signIn = async (o: {
  provider: provider;
  onSuccess?: (u: FirebaseUser) => void;
}) => {
  let signInWith: () => Promise<UserCredential>;

  switch (o.provider) {
    case "google":
      signInWith = async () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
      };
      break;
  }

  const providerResponse = await signInWith();

  const overrideUserT = providerResponse.user as FirebaseUser & {
    stsTokenManager: { expirationTime: number };
  };

  const authToken = await providerResponse.user.getIdToken();

  createCookie(
    "authToken",
    authToken,
    new Date(overrideUserT.stsTokenManager.expirationTime)
  );

  // Update the user in Firestore
  const db = getFirestore(clientApp);
  const userRef = doc(db, `users/${providerResponse.user.uid}`);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Create the user in Firestore
    const initialUser: UserT = {
      displayName: providerResponse.user.displayName || "",
      email: providerResponse.user.email || "",
      emailVerified: providerResponse.user.emailVerified,
      photoURL: providerResponse.user.photoURL || "",
      uid: providerResponse.user.uid,
      createdAt: Date.now(),
      publicKey: "",
      contacts: [],
    };

    await setDoc(userRef, initialUser, { merge: true });
  }

  if (o.onSuccess) o.onSuccess(providerResponse.user);

  return providerResponse;
};

function createCookie(name: string, value: string, expireDate: Date) {
  const expires = "; expires=" + expireDate.toUTCString();
  document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name: string) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c?.charAt(0) == " ") c = c.substring(1, c.length);
    if (c?.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name: string) {
  createCookie(name, "", new Date(0));
}

const signOut = async (o: { onSuccess?: () => unknown }) => {
  await auth.signOut();

  deleteCookie("authToken");

  if (o.onSuccess) o.onSuccess();
};

export {
  signIn,
  signOut,
  createCookie,
  readCookie,
  deleteCookie,
  useAuthUser,
  auth,
};
