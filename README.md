# Control Operativo — Sistema de Checklists

Guía paso a paso para dejar el sistema funcionando en producción.

---

## 1. Crear el proyecto de Firebase

1. Entrá a https://console.firebase.google.com y creá un proyecto nuevo
   (ej: `checklists-operativos`).
2. Dentro del proyecto, andá a **⚙️ Configuración del proyecto → General**,
   bajá hasta "Tus apps" y hacé clic en el ícono `</>` (Web).
3. Registrá la app (no hace falta Firebase Hosting, vamos a usar GitHub Pages).
4. Firebase te va a mostrar un objeto `firebaseConfig`. Copialo.
5. Abrí `js/firebase-config.js` en este proyecto y reemplazá los valores
   de ejemplo por los tuyos.

## 2. Habilitar Authentication

1. En el menú lateral de Firebase: **Build → Authentication → Get started**.
2. En la pestaña **Sign-in method**, habilitá **Email/Password**.
3. No hace falta configurar nada más acá — los usuarios se crean manualmente
   (ver paso 5).

## 3. Crear la base de datos Firestore

1. **Build → Firestore Database → Create database**.
2. Elegí **modo producción** (no "modo de prueba" — vamos a subir nuestras
   propias reglas de seguridad en el paso siguiente).
3. Elegí la región más cercana (ej. `southamerica-east1`).

## 4. Subir las reglas de seguridad

1. Dentro de Firestore Database, andá a la pestaña **Rules**.
2. Reemplazá todo el contenido por el de `firestore.rules` (este proyecto).
3. Publicá.

> Estas reglas hacen que cada usuario solo pueda ver/editar lo que le
> corresponde según su rol y permisos — ver el archivo `firestore.rules`
> para el detalle de cada colección.

## 5. Crear el usuario Administrador inicial

1. **Authentication → Users → Add user**. Cargá el email y contraseña
   del Admin (ej. `admin@tuempresa.com`).
2. Copiá el **User UID** que Firebase le asigna (aparece en la lista de usuarios).
3. Andá a **Firestore Database → Data → Start collection** → nombre: `usuarios`.
4. Creá un documento **usando ese mismo UID como ID del documento** (muy
   importante: el ID del documento debe ser igual al UID de Authentication).
   Campos:
   - `nombre` (string): `"Admin"`
   - `email` (string): el mismo que usaste en el paso 1
   - `rolId` (string): lo vas a completar en el paso 6, una vez que
     exista el rol "Gerencia General"
   - `sectores` (array): `[]`
   - `activo` (boolean): `true`

## 6. Ejecutar el seed (roles, sectores, preguntas base)

1. Subí el proyecto a GitHub Pages primero (ver paso 8) **o** abrí
   `seed.html` localmente con un servidor local (no funciona con
   `file://` directo por CORS — usá por ejemplo la extensión "Live Server"
   de VS Code, o `python3 -m http.server` desde la carpeta del proyecto).
2. Abrí `seed.html` en el navegador y hacé clic en **"Ejecutar inicialización"**.
3. Esto crea automáticamente:
   - El árbol de roles completo (Gerencia General → Gerente de Compras /
     Gerente de Tienda / Tesorería → sus respectivos coordinadores)
   - Los sectores (Ventas, Compras, Caja, Limpieza)
   - Las 3 preguntas de ejemplo para "Coordinadores de Sector"
     (Flejes en condiciones / Uniforme / Sector limpio)
4. En el log de la página vas a ver el ID del rol **"Gerencia General"**.
   Copialo.
5. Volvé al documento del Admin que creaste en el paso 5 y completá el
   campo `rolId` con ese ID.

⚠️ **Ejecutá `seed.html` una sola vez.** Si lo corrés de nuevo, va a
duplicar todos los roles y preguntas.

## 7. Cargar el resto de los usuarios

A diferencia del Admin (que se crea manualmente una única vez, paso 5),
el resto de los usuarios se cargan **desde la propia app**:

1. Logueate como Admin.
2. Andá a **Administración → Usuarios**.
3. Completá nombre, email, contraseña inicial, rol y sectores, y hacé clic
   en **"Crear usuario"**.

Esto crea automáticamente el login (Firebase Auth) y el perfil
(Firestore) en un solo paso, sin pasar por la consola de Firebase.

> Detalle técnico: el formulario usa una **instancia secundaria de
> Firebase** (ver `js/firebase-config.js`, función `getAuthSecundaria`)
> exclusivamente para crear la credencial nueva. Esto evita el
> comportamiento por defecto de Firebase Auth en el navegador, donde
> crear un usuario nuevo cambia automáticamente la sesión activa hacia
> ese usuario — así el Admin nunca pierde su propia sesión al dar de
> alta a otra persona.

## 8. Publicar en GitHub Pages

1. Creá un repositorio nuevo en GitHub (puede ser privado si tu plan lo permite).
2. Subí **todo el contenido de esta carpeta** (`index.html`, `seed.html`,
   `css/`, `js/`, `firestore.rules`, este `README.md`) a la raíz del repo.
3. En el repositorio: **Settings → Pages**.
4. En "Source", elegí la rama (`main`) y la carpeta `/ (root)`.
5. Guardá. GitHub te va a dar una URL pública, algo como:
   `https://tu-usuario.github.io/tu-repo/`
6. Esperá 1-2 minutos y entrá a esa URL — debería aparecer la pantalla de login.

### Autorizar el dominio en Firebase

Firebase Auth solo permite login desde dominios autorizados:

1. **Authentication → Settings → Authorized domains → Add domain**.
2. Agregá `tu-usuario.github.io`.

## 9. Probar el flujo completo

1. Entrá a la URL de GitHub Pages.
2. Logueate con el usuario Admin.
3. Deberías ver **"Mi checklist"**, **"Panel"** y **"Administración"** en
   el menú lateral (porque Gerencia General tiene todos los permisos).
4. En **Administración → Usuarios** vas a ver la lista (por ahora de solo
   lectura — la carga se hace desde Firebase Console, paso 7).
5. Creá un usuario de prueba con rol "Coordinadores de Sector" y logueate
   con él en otra ventana/incógnito — debería ver únicamente "Mi checklist"
   con las 3 preguntas cargadas, y el switch SÍ/NO con motivo obligatorio.

## 10. Pendiente para una siguiente etapa: alertas automáticas

El documento funcional pide que, si un responsable no completa su checklist
en la ventana AM (hasta 11:59) o PM (hasta 20:00), se genere una alerta
automática al superior. Esto requiere una **Cloud Function programada**
(Firebase Functions + Cloud Scheduler), que sí necesita Node.js/npm para
desplegarse — es la única parte del proyecto que no puede ser "solo subir
archivos". La dejamos para una segunda etapa una vez que el flujo base
esté validado en uso real; el modelo de datos (`data.js`, colección
`alertas`) ya está preparado para recibir esa función sin cambios.

---

## 11. La app ahora es instalable (PWA)

Una vez publicada en GitHub Pages con HTTPS (ya lo tenés resuelto), cualquier
usuario puede "instalarla" como si fuera una app nativa:

- **Android (Chrome)**: al entrar a la URL, aparece un banner o el menú
  (⋮) tiene la opción **"Instalar aplicación"** / **"Agregar a pantalla
  de inicio"**.
- **iPhone (Safari)**: botón de compartir (□↑) → **"Agregar a pantalla
  de inicio"**. iOS no soporta el banner automático de instalación, por
  eso este paso es manual ahí.
- **Escritorio (Chrome/Edge)**: ícono de instalación (⊕) al final de la
  barra de direcciones.

Con esto, la app abre en pantalla completa (sin la barra del navegador)
y queda con su propio ícono, como cualquier otra app del celular.

### Qué SÍ y qué NO hace esto

- ✅ Ícono instalable, carga más rápida en visitas repetidas, arranque
  más resistente a conexión lenta.
- ❌ **No** permite completar ni guardar el checklist sin conexión —
  eso sigue necesitando internet porque depende de Firestore en tiempo
  real. Si en el futuro hace falta un modo realmente offline (por
  ejemplo, zonas del local sin señal), es un desarrollo aparte
  (guardado en cola local + sincronización cuando vuelve la conexión).

### Si en el futuro modificás archivos de la app

El Service Worker (`sw.js`) cachea los archivos para que carguen rápido.
Esto tiene una consecuencia: si actualizás `app.js`, `styles.css`, etc.,
**algunos usuarios podrían seguir viendo la versión vieja cacheada**
hasta que el navegador note el cambio. Para forzar que todos reciban la
actualización apenas la subís, cambiá el número de versión al principio
de `sw.js`:

```javascript
const CACHE_NAME = 'checklist-app-v1';   // cambiar a v2, v3, etc.
```

## Estructura del proyecto

```
checklist-app/
├── index.html          → app principal
├── seed.html            → inicialización única de datos base
├── manifest.json         → configuración de la PWA (nombre, íconos, colores)
├── sw.js                 → Service Worker (cachea el shell de la app)
├── firestore.rules      → reglas de seguridad (pegar en Firebase Console)
├── icons/                → íconos de la app (192, 512, maskable, apple-touch)
├── css/
│   └── styles.css       → sistema de diseño
└── js/
    ├── firebase-config.js  → credenciales del proyecto Firebase
    ├── data.js             → toda la lógica de acceso a Firestore
    ├── auth.js             → pantalla de login
    ├── checklist.js        → pantalla "Mi checklist"
    ├── dashboard.js         → panel de supervisión / métricas / historial
    └── admin.js             → administración (roles, sectores, preguntas, usuarios)
```
