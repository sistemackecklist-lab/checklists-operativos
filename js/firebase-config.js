const firebaseConfig = {
  apiKey: "AIzaSyBS9fY8txtO_TFhlhhTj4KfImCUu65cLJo",
  authDomain: "checklists-operativos.firebaseapp.com",
  projectId: "checklists-operativos",
  storageBucket: "checklists-operativos.firebasestorage.app",
  messagingSenderId: "795436931731",
  appId: "1:795436931731:web:16eadab3691af027eacb66"
};

firebase.initializeApp(firebaseConfig);

// Servicios que usaremos en toda la app
const auth = firebase.auth();
const db = firebase.firestore();

// Sesión persistente en el dispositivo ("recordar sesión")
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
