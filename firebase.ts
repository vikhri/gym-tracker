// FIX: Use Firebase v8 namespaced API for compatibility.
// FIX: Use Firebase v9 compat libraries to support the v8 namespaced API.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBSnKwUhfCksupnNMXkl4RocHb3dpHdj_w",
  authDomain: "gym-tracker-f5ee2.firebaseapp.com",
  projectId: "gym-tracker-f5ee2",
  storageBucket: "gym-tracker-f5ee2.firebasestorage.app",
  messagingSenderId: "461445033701",
  appId: "1:461445033701:web:16d114257b6763c07e6e0c",
  measurementId: "G-04MS057Y70"
};

// Initialize Firebase
// FIX: Use Firebase v8 namespaced API for initialization.
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Enable offline persistence
// FIX: Use Firebase v8 namespaced API for enabling persistence.
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time.
      // ...
      console.error("Firebase persistence failed: failed-precondition");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      // ...
      console.error("Firebase persistence failed: unimplemented");
    }
  });


export { app, auth, db, googleProvider };