// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore"; // 👈 Import Firestore
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyC91hjVgrFf-mVqiyClntL8jWr3Qs_kaWg",
//   authDomain: "trend99-a6632.firebaseapp.com",
//   databaseURL: "https://trend99-a6632-default-rtdb.firebaseio.com",
//   projectId: "trend99-a6632",
//   storageBucket: "trend99-a6632.firebasestorage.app",
//   messagingSenderId: "928587522864",
//   appId: "1:928587522864:web:8531ff6a2d230f70565ef5",
//   measurementId: "G-CK4MFB9MJM"
// };

const firebaseConfig = {
  apiKey: "AIzaSyCKdaUx8hS6R4gLx6PFwhhdWPG2EF_VQaA",
  authDomain: "trend99-160fc.firebaseapp.com",
  projectId: "trend99-160fc",
  storageBucket: "trend99-160fc.firebasestorage.app",
  messagingSenderId: "857354452804",
  appId: "1:857354452804:web:0bb52271692e322f26e111",
  measurementId: "G-9ESXJZDCTV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// @ts-ignore
const analytics = getAnalytics(app);

export const db = getFirestore(app);