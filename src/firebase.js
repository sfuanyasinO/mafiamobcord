import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB71ha2uj-ivkvSQghXMvDBiZbLJQPWXHc",
    authDomain: "discordclone-32822.firebaseapp.com",
    projectId: "discordclone-32822",
    storageBucket: "discordclone-32822.firebasestorage.app",
    messagingSenderId: "335872929164",
    appId: "1:335872929164:web:9b334b16454def72007aa9",
    measurementId: "G-B7GBQEL4G2"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
