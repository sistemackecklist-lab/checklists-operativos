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

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
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
