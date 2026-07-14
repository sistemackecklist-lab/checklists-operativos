/* ============================================================
   CAPA DE DATOS — todo lo que habla con Firestore vive acá.
   Los componentes de UI nunca llaman a Firestore directamente:
   siempre pasan por estas funciones. Así, si mañana cambia el
   modelo, se ajusta en un solo lugar.
   ============================================================ */

const Data = {

  // ---------- USUARIOS ----------

  async getUsuarioPorUid(uid) {
    const doc = await db.collection('usuarios').doc(uid).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getUsuarios() {
    const snap = await db.collection('usuarios').orderBy('nombre').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Crea el login (Firebase Auth) y el perfil (Firestore) de un usuario
  // nuevo en un solo paso, usando la instancia secundaria de Firebase
  // para no afectar la sesión del Admin que lo está creando.
  async crearUsuarioCompleto({ nombre, email, password, rolId, sectores }) {
    const authSecundaria = getAuthSecundaria();
    const cred = await authSecundaria.createUserWithEmailAndPassword(email.trim(), password);
    const uid = cred.user.uid;

    // Cerramos la sesión de la instancia secundaria: ya cumplió su
    // propósito (crear las credenciales) y no la necesitamos más.
    await authSecundaria.signOut();

    await db.collection('usuarios').doc(uid).set({
      nombre: nombre.trim(),
      email: email.trim(),
      rolId,
      sectores: sectores || [],
      activo: true,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    return uid;
  },

  async getUsuariosPorRol(rolId) {
    const snap = await db.collection('usuarios')
      .where('rolId', '==', rolId)
      .where('activo', '==', true)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async actualizarUsuario(usuarioId, { nombre, rolId, sectores }) {
    return db.collection('usuarios').doc(usuarioId).update({ nombre, rolId, sectores: sectores || [] });
  },

  // No se puede borrar la credencial de Auth de otro usuario desde el
  // cliente (requiere privilegios de administrador / Cloud Function).
  // Por eso, "eliminar" un usuario en la app significa desactivar su
  // perfil: no puede volver a loguearse útilmente (queda sin permisos
  // ni datos visibles) y desaparece de los listados de personas activas,
  // pero su credencial de login sigue técnicamente existiendo en
  // Firebase Auth hasta que la borren manualmente desde la consola.
  async desactivarUsuario(usuarioId) {
    return db.collection('usuarios').doc(usuarioId).update({ activo: false });
  },

  async reactivarUsuario(usuarioId) {
    return db.collection('usuarios').doc(usuarioId).update({ activo: true });
  },

  // ---------- ROLES ----------

  async getRoles() {
    const snap = await db.collection('roles').orderBy('nombre').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getRol(rolId) {
    const doc = await db.collection('roles').doc(rolId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  // Usuarios que reportan a un rol (los que tienen rolSuperiorId === rolId)
  // Solo trae el nivel inmediato — se usa para validaciones puntuales
  // (ej. "¿puedo borrar este rol?"). Para reportes jerárquicos completos
  // usar getRolesDescendientes.
  async getRolesSubordinados(rolId) {
    const snap = await db.collection('roles').where('rolSuperiorId', '==', rolId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Trae TODOS los roles que están por debajo de rolId en el árbol,
  // sin importar cuántos niveles de profundidad haya (hijos, nietos,
  // bisnietos...). Esto es lo que se necesita para que un supervisor
  // vea los checklists de TODA su cadena de mando, no solo del nivel
  // inmediato de abajo.
  async getRolesDescendientes(rolId) {
    const todos = [];
    let nivelActual = [rolId];

    // Recorre nivel por nivel hasta que no queden más hijos.
    // El límite de 10 niveles es solo una salvaguarda contra un
    // ciclo accidental en los datos (un rol que termine apuntando
    // a sí mismo indirectamente); una jerarquía normal de tienda
    // no debería tener más de 4 o 5 niveles.
    for (let i = 0; i < 10 && nivelActual.length > 0; i++) {
      const hijosPorNivel = await Promise.all(
        nivelActual.map(id => this.getRolesSubordinados(id))
      );
      const hijos = hijosPorNivel.flat();
      if (hijos.length === 0) break;
      todos.push(...hijos);
      nivelActual = hijos.map(r => r.id);
    }
    return todos;
  },

  async crearRol({ nombre, descripcion, rolSuperiorId, permisos }) {
    return db.collection('roles').add({
      nombre, descripcion, rolSuperiorId: rolSuperiorId || null,
      permisos: permisos || {},
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async actualizarRol(rolId, { nombre, descripcion, rolSuperiorId, permisos }) {
    return db.collection('roles').doc(rolId).update({
      nombre, descripcion, rolSuperiorId: rolSuperiorId || null,
      permisos: permisos || {}
    });
  },

  // Antes de borrar, verifica que ningún usuario, pregunta u otro rol
  // dependa de este rol. Devuelve { puede: bool, motivo: string }.
  async puedeEliminarRol(rolId) {
    const [usuarios, subRoles, preguntasSnap] = await Promise.all([
      this.getUsuariosPorRol(rolId),
      this.getRolesSubordinados(rolId),
      db.collection('preguntas').where('rolId', '==', rolId).where('activa', '==', true).get()
    ]);
    if (usuarios.length > 0) {
      return { puede: false, motivo: `Hay ${usuarios.length} usuario(s) con este rol asignado.` };
    }
    if (subRoles.length > 0) {
      return { puede: false, motivo: `Hay ${subRoles.length} rol(es) que reportan a este rol.` };
    }
    if (!preguntasSnap.empty) {
      return { puede: false, motivo: `Hay ${preguntasSnap.size} pregunta(s) activas asociadas a este rol.` };
    }
    return { puede: true, motivo: '' };
  },

  async eliminarRol(rolId) {
    return db.collection('roles').doc(rolId).delete();
  },

  // ---------- SECTORES ----------

  async getSectores() {
    const snap = await db.collection('sectores').where('activo', '==', true).orderBy('nombre').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async crearSector(nombre) {
    return db.collection('sectores').add({ nombre, activo: true });
  },

  async actualizarSector(sectorId, nombre) {
    return db.collection('sectores').doc(sectorId).update({ nombre });
  },

  async puedeEliminarSector(sectorId) {
    const snap = await db.collection('usuarios').where('sectores', 'array-contains', sectorId).get();
    if (!snap.empty) {
      return { puede: false, motivo: `Hay ${snap.size} usuario(s) asignados a este sector.` };
    }
    return { puede: true, motivo: '' };
  },

  // Soft-delete: se desactiva en vez de borrar, para no perder la
  // trazabilidad histórica de los checklists ya guardados con este sector.
  async eliminarSector(sectorId) {
    return db.collection('sectores').doc(sectorId).update({ activo: false });
  },

  // ---------- PREGUNTAS ----------

  async getPreguntasPorRol(rolId) {
    const snap = await db.collection('preguntas')
      .where('rolId', '==', rolId)
      .where('activa', '==', true)
      .orderBy('orden')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async crearPregunta({ rolId, texto, orden }) {
    return db.collection('preguntas').add({
      rolId, texto, orden: orden || 0, activa: true,
      creadaEn: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async desactivarPregunta(preguntaId) {
    return db.collection('preguntas').doc(preguntaId).update({ activa: false });
  },

  // ---------- CHECKLISTS: INSTANCIAS ----------

  // Determina el momento (AM/PM) según la hora actual.
  // AM termina 11:59, PM termina 20:00 (definido por el negocio).
  getMomentoActual() {
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    const minutosDelDia = h * 60 + m;
    return minutosDelDia <= (11 * 60 + 59) ? 'AM' : 'PM';
  },

  getFechaHoy() {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  },

  // ¿Ya completó este usuario el checklist del momento actual, hoy?
  async yaCompletoHoy(usuarioId, momento) {
    const snap = await db.collection('checklists_instancias')
      .where('usuarioId', '==', usuarioId)
      .where('fecha', '==', this.getFechaHoy())
      .where('momento', '==', momento)
      .limit(1)
      .get();
    return !snap.empty;
  },

  // Guarda el checklist respondido. `respuestas` es un array de:
  // { preguntaId, textoPregunta, respuesta: 'si'|'no', motivo }
  // El texto de la pregunta se guarda como snapshot (inmutable),
  // así si la pregunta cambia después, el historial no se altera.
  async guardarChecklist({ usuario, sectorId, respuestas }) {
    const momento = this.getMomentoActual();
    const fecha = this.getFechaHoy();

    const ref = await db.collection('checklists_instancias').add({
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      rolId: usuario.rolId,
      sectorId: sectorId || null,
      fecha,
      momento,
      horaCompletado: firebase.firestore.FieldValue.serverTimestamp(),
      respuestas
    });

    // Por cada respuesta "No", se crea automáticamente una acción
    // correctiva pendiente de revisión por el supervisor.
    const negativas = respuestas.filter(r => r.respuesta === 'no');
    const batch = db.batch();
    negativas.forEach(r => {
      const accionRef = db.collection('acciones_correctivas').doc();
      batch.set(accionRef, {
        checklistInstanciaId: ref.id,
        usuarioId: usuario.id,
        usuarioNombre: usuario.nombre,
        rolId: usuario.rolId,
        sectorId: sectorId || null,
        preguntaTexto: r.textoPregunta,
        motivoInformado: r.motivo,
        fecha,
        observacionSupervisor: '',
        accionRealizada: '',
        resuelto: false,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    if (negativas.length) await batch.commit();

    return ref.id;
  },

  async getChecklistsPorRoles(rolIds, { fecha } = {}) {
    if (!rolIds.length) return [];
    // Firestore permite hasta 10 valores en 'in'
    const chunks = [];
    for (let i = 0; i < rolIds.length; i += 10) chunks.push(rolIds.slice(i, i + 10));

    const resultados = [];
    for (const chunk of chunks) {
      let q = db.collection('checklists_instancias').where('rolId', 'in', chunk);
      if (fecha) q = q.where('fecha', '==', fecha);
      const snap = await q.get();
      snap.docs.forEach(d => resultados.push({ id: d.id, ...d.data() }));
    }
    return resultados;
  },

  // ---------- ACCIONES CORRECTIVAS ----------

  async getAccionesPendientes() {
    const snap = await db.collection('acciones_correctivas')
      .where('resuelto', '==', false)
      .orderBy('creadoEn', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getAccionesResueltas(limite = 30) {
    const snap = await db.collection('acciones_correctivas')
      .where('resuelto', '==', true)
      .orderBy('resueltoEn', 'desc')
      .limit(limite)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Trae TODAS las acciones (resueltas o no) dentro de un rango de fechas
  // (formato YYYY-MM-DD), para armar métricas y gráficos. Es una consulta
  // de rango sobre un solo campo, no necesita índice compuesto.
  async getAccionesEnRango(desde, hasta) {
    const snap = await db.collection('acciones_correctivas')
      .where('fecha', '>=', desde)
      .where('fecha', '<=', hasta)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async resolverAccion(accionId, { observacionSupervisor, accionRealizada }) {
    return db.collection('acciones_correctivas').doc(accionId).update({
      observacionSupervisor, accionRealizada,
      resuelto: true,
      resueltoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  // ---------- ALERTAS ----------

  async getAlertasPendientes() {
    const snap = await db.collection('alertas')
      .where('estado', '==', 'pendiente')
      .orderBy('creadoEn', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};
