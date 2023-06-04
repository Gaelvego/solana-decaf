// This file initializes the firebase app
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCajZdU5Ra5GfbltnF0DaxxYWaxE-RFfJY",
  authDomain: "solana-decaf.firebaseapp.com",
  projectId: "solana-decaf",
  storageBucket: "solana-decaf.appspot.com",
  messagingSenderId: "908007042067",
  appId: "1:908007042067:web:53a189ef609a975f45a3e6",
  measurementId: "G-SN847WY43V",
};

/**
 * The firebase client app instance.
 */
const clientApp = initializeApp(firebaseConfig);

export { clientApp };
