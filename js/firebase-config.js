/* ============================================================
   FIREBASE CONFIG
   ------------------------------------------------------------
   1. Andá a https://console.firebase.google.com
   2. Creá un proyecto nuevo (ej: "checklists-operativos")
   3. Dentro del proyecto: ⚙️ Configuración del proyecto → General
      → "Tus apps" → ícono </> (Web) → registrar app
   4. Copiá el objeto firebaseConfig que te da Firebase y
      reemplazá los valores de abajo por los tuyos.
   ============================================================ */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBS9fY8txtO_TFhlhhTj4KfImCUu65cLJo",
  authDomain: "checklists-operativos.firebaseapp.com",
  projectId: "checklists-operativos",
  storageBucket: "checklists-operativos.firebasestorage.app",
  messagingSenderId: "795436931731",
  appId: "1:795436931731:web:16eadab3691af027eacb66",
  measurementId: "G-H9YQ9B0ZXC"
};

firebase.initializeApp(firebaseConfig);

// Servicios que usaremos en toda la app
const auth = firebase.auth();
const db = firebase.firestore();

// Sesión persistente en el dispositivo ("recordar sesión")
// El usuario no tiene que loguearse cada vez que abre la app.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

/* ------------------------------------------------------------
   INSTANCIA SECUNDARIA DE FIREBASE
   Se usa exclusivamente para dar de alta usuarios nuevos desde
   Administración. Si usáramos la instancia principal (`auth`)
   para crear el usuario, el SDK automáticamente cambia la sesión
   activa al usuario recién creado, "deslogueando" al Admin que
   lo está creando. Esta segunda instancia, en cambio, mantiene
   su propia sesión aislada, así el Admin nunca pierde la suya.
   ------------------------------------------------------------ */
function getAuthSecundaria() {
  let appSecundaria;
  try {
    appSecundaria = firebase.app('Secundaria');
  } catch (e) {
    appSecundaria = firebase.initializeApp(firebaseConfig, 'Secundaria');
  }
  return appSecundaria.auth();
}
