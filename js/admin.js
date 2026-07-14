/* ============================================================
   ADMINISTRACIÓN — gestión de Roles, Sectores, Preguntas y
   Usuarios. Visible solo para roles con el permiso correspon-
   diente (ver app.js / permisos del rol).
   ============================================================ */

function AdminScreen({ usuario }) {
  const [tab, setTab] = React.useState('roles');

  const tabs = [
    { id: 'roles', label: 'Roles' },
    { id: 'sectores', label: 'Sectores' },
    { id: 'preguntas', label: 'Preguntas' },
    { id: 'usuarios', label: 'Usuarios' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={'btn ' + (tab === t.id ? 'btn-primary' : 'btn-ghost')}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'roles' && <AdminRoles />}
      {tab === 'sectores' && <AdminSectores />}
      {tab === 'preguntas' && <AdminPreguntas />}
      {tab === 'usuarios' && <AdminUsuarios />}
    </div>
  );
}

/* ---------------- ROLES ---------------- */

const PERMISOS_DISPONIBLES = [
  { key: 'administrarRoles', label: 'Administrar roles' },
  { key: 'administrarUsuarios', label: 'Administrar usuarios' },
  { key: 'administrarPreguntas', label: 'Administrar preguntas' },
  { key: 'administrarSectores', label: 'Administrar sectores' },
  { key: 'verPanelGlobal', label: 'Ver panel global' },
  { key: 'verReportesDeEquipo', label: 'Ver checklists del equipo a cargo' },
  { key: 'resolverAccionesCorrectivas', label: 'Resolver acciones correctivas' }
];

function AdminRoles() {
  const [roles, setRoles] = React.useState(null);
  const [nombre, setNombre] = React.useState('');
  const [descripcion, setDescripcion] = React.useState('');
  const [rolSuperiorId, setRolSuperiorId] = React.useState('');
  const [permisos, setPermisos] = React.useState({});
  const [guardando, setGuardando] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState(null); // null = modo "crear"
  const [error, setError] = React.useState('');

  async function cargar() {
    setRoles(await Data.getRoles());
  }
  React.useEffect(() => { cargar(); }, []);

  function togglePermiso(key) {
    setPermisos(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function limpiarForm() {
    setNombre(''); setDescripcion(''); setRolSuperiorId(''); setPermisos({});
    setEditandoId(null); setError('');
  }

  function empezarEdicion(rol) {
    setEditandoId(rol.id);
    setNombre(rol.nombre || '');
    setDescripcion(rol.descripcion || '');
    setRolSuperiorId(rol.rolSuperiorId || '');
    setPermisos(rol.permisos || {});
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar() {
    if (!nombre.trim()) return;
    // Un rol no puede ser su propio superior, ni el superior de uno de sus ancestros
    // (evita ciclos simples; validación completa de ciclos queda para una v2).
    if (editandoId && rolSuperiorId === editandoId) {
      setError('Un rol no puede reportar a sí mismo.');
      return;
    }
    setGuardando(true);
    if (editandoId) {
      await Data.actualizarRol(editandoId, { nombre: nombre.trim(), descripcion, rolSuperiorId: rolSuperiorId || null, permisos });
    } else {
      await Data.crearRol({ nombre: nombre.trim(), descripcion, rolSuperiorId: rolSuperiorId || null, permisos });
    }
    limpiarForm();
    setGuardando(false);
    cargar();
  }

  async function eliminar(rol) {
    const chequeo = await Data.puedeEliminarRol(rol.id);
    if (!chequeo.puede) {
      alert(`No se puede eliminar "${rol.nombre}": ${chequeo.motivo}`);
      return;
    }
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`)) return;
    await Data.eliminarRol(rol.id);
    if (editandoId === rol.id) limpiarForm();
    cargar();
  }

  return (
    <div>
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>
          {editandoId ? 'Editar rol' : 'Nuevo rol'}
        </div>
        <div className="field">
          <label>Nombre del rol</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Coordinador de Ventas" />
        </div>
        <div className="field">
          <label>Descripción (opcional)</label>
          <input value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        </div>
        <div className="field">
          <label>Reporta a (rol superior)</label>
          <select value={rolSuperiorId} onChange={e => setRolSuperiorId(e.target.value)}>
            <option value="">— Nivel más alto (sin superior) —</option>
            {(roles || []).filter(r => r.id !== editandoId).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Permisos</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PERMISOS_DISPONIBLES.map(p => (
              <label key={p.key} className="checkbox-row" style={{ marginBottom: 0 }}>
                <input type="checkbox" checked={!!permisos[p.key]} onChange={() => togglePermiso(p.key)} />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" disabled={guardando || !nombre.trim()} onClick={guardar}>
            {guardando ? 'Guardando…' : (editandoId ? 'Guardar cambios' : 'Crear rol')}
          </button>
          {editandoId && (
            <button className="btn btn-ghost" onClick={limpiarForm}>Cancelar edición</button>
          )}
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>Rol</th><th>Reporta a</th><th>Permisos</th><th></th></tr>
          </thead>
          <tbody>
            {(roles || []).map(r => (
              <tr key={r.id}>
                <td>{r.nombre}</td>
                <td>{(roles.find(x => x.id === r.rolSuperiorId) || {}).nombre || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  {Object.entries(r.permisos || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || '—'}
                </td>
                <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => empezarEdicion(r)}>Editar</button>
                  <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => eliminar(r)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {roles && roles.length === 0 && <div className="empty-state">Todavía no hay roles creados.</div>}
      </div>
    </div>
  );
}

/* ---------------- SECTORES ---------------- */

function AdminSectores() {
  const [sectores, setSectores] = React.useState(null);
  const [error, setError] = React.useState('');
  const [nombre, setNombre] = React.useState('');
  const [editandoId, setEditandoId] = React.useState(null);
  const [nombreEdit, setNombreEdit] = React.useState('');

  async function cargar() {
    setError('');
    try {
      setSectores(await Data.getSectores());
    } catch (err) {
      console.error('Error cargando sectores:', err);
      setError(
        err.code === 'failed-precondition'
          ? 'Falta crear un índice en Firestore para esta consulta. Mirá la consola (F12) — el error trae un link para crearlo con un clic.'
          : 'No se pudieron cargar los sectores: ' + err.message
      );
    }
  }
  React.useEffect(() => { cargar(); }, []);

  async function crear() {
    if (!nombre.trim()) return;
    await Data.crearSector(nombre.trim());
    setNombre('');
    cargar();
  }

  function empezarEdicion(s) {
    setEditandoId(s.id);
    setNombreEdit(s.nombre);
  }

  async function guardarEdicion(id) {
    if (!nombreEdit.trim()) return;
    await Data.actualizarSector(id, nombreEdit.trim());
    setEditandoId(null);
    cargar();
  }

  async function eliminar(s) {
    const chequeo = await Data.puedeEliminarSector(s.id);
    if (!chequeo.puede) {
      alert(`No se puede eliminar "${s.nombre}": ${chequeo.motivo}`);
      return;
    }
    if (!confirm(`¿Eliminar el sector "${s.nombre}"?`)) return;
    await Data.eliminarSector(s.id);
    cargar();
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del sector (ej: Caja)" style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text)' }} />
          <button className="btn btn-primary" onClick={crear} disabled={!nombre.trim()}>Agregar</button>
        </div>
      </div>

      {error && <div className="card" style={{ borderColor: 'var(--danger)' }}><span className="error-text" style={{ margin: 0 }}>{error}</span></div>}

      <div className="card">
        {sectores === null && !error && <div className="spinner-row">Cargando…</div>}
        {(sectores || []).map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
            {editandoId === s.id ? (
              <>
                <input value={nombreEdit} onChange={e => setNombreEdit(e.target.value)} style={{ flex: 1, marginRight: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => guardarEdicion(s.id)}>Guardar</button>
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setEditandoId(null)}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <span>{s.nombre}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => empezarEdicion(s)}>Editar</button>
                  <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => eliminar(s)}>Eliminar</button>
                </div>
              </>
            )}
          </div>
        ))}
        {sectores && sectores.length === 0 && <div className="empty-state">Todavía no hay sectores.</div>}
      </div>
    </div>
  );
}

/* ---------------- PREGUNTAS ---------------- */

function AdminPreguntas() {
  const [roles, setRoles] = React.useState([]);
  const [rolId, setRolId] = React.useState('');
  const [preguntas, setPreguntas] = React.useState(null);
  const [texto, setTexto] = React.useState('');

  React.useEffect(() => { Data.getRoles().then(setRoles); }, []);

  async function cargarPreguntas(rid) {
    if (!rid) { setPreguntas(null); return; }
    setPreguntas(await Data.getPreguntasPorRol(rid));
  }

  React.useEffect(() => { cargarPreguntas(rolId); }, [rolId]);

  async function agregar() {
    if (!texto.trim() || !rolId) return;
    const orden = (preguntas || []).length;
    await Data.crearPregunta({ rolId, texto: texto.trim(), orden });
    setTexto('');
    cargarPreguntas(rolId);
  }

  async function desactivar(id) {
    await Data.desactivarPregunta(id);
    cargarPreguntas(rolId);
  }

  return (
    <div>
      <div className="card">
        <div className="field">
          <label>Rol</label>
          <select value={rolId} onChange={e => setRolId(e.target.value)}>
            <option value="">Seleccioná un rol…</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>

        {rolId && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Texto de la nueva pregunta"
                   style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text)' }} />
            <button className="btn btn-primary" onClick={agregar} disabled={!texto.trim()}>Agregar</button>
          </div>
        )}
      </div>

      {rolId && (
        <div className="card">
          {preguntas === null && <div className="spinner-row">Cargando…</div>}
          {preguntas && preguntas.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <span>{p.texto}</span>
              <button className="btn btn-ghost" onClick={() => desactivar(p.id)}>Desactivar</button>
            </div>
          ))}
          {preguntas && preguntas.length === 0 && <div className="empty-state">Este rol todavía no tiene preguntas activas.</div>}
        </div>
      )}
    </div>
  );
}

/* ---------------- USUARIOS ---------------- */

function AdminUsuarios() {
  const [usuarios, setUsuarios] = React.useState(null);
  const [roles, setRoles] = React.useState([]);
  const [sectores, setSectores] = React.useState([]);
  const [errorCarga, setErrorCarga] = React.useState('');

  // Formulario de alta
  const [nombre, setNombre] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rolId, setRolId] = React.useState('');
  const [sectoresSel, setSectoresSel] = React.useState([]);
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState('');
  const [exito, setExito] = React.useState('');

  // Edición de un usuario existente
  const [editandoId, setEditandoId] = React.useState(null);
  const [editNombre, setEditNombre] = React.useState('');
  const [editRolId, setEditRolId] = React.useState('');
  const [editSectores, setEditSectores] = React.useState([]);

  // Cada consulta se carga por separado: si una falla (ej. falta un
  // índice en Firestore), no tumba a las demás.
  async function cargarTodo() {
    setErrorCarga('');
    const [uRes, rRes, sRes] = await Promise.allSettled([
      Data.getUsuarios(), Data.getRoles(), Data.getSectores()
    ]);
    if (uRes.status === 'fulfilled') setUsuarios(uRes.value); else setUsuarios([]);
    if (rRes.status === 'fulfilled') setRoles(rRes.value); else setRoles([]);
    if (sRes.status === 'fulfilled') setSectores(sRes.value); else setSectores([]);

    const fallidas = [uRes, rRes, sRes].filter(r => r.status === 'rejected');
    if (fallidas.length) {
      setErrorCarga('No se pudo cargar todo correctamente. Revisá la consola (F12) — es probable que falte crear un índice en Firestore (el error trae un link para crearlo con un clic).');
    }
  }
  React.useEffect(() => { cargarTodo(); }, []);

  function nombreRol(id) {
    return (roles.find(r => r.id === id) || {}).nombre || '—';
  }

  function toggleSector(id) {
    setSectoresSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleSectorEdit(id) {
    setEditSectores(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function limpiarForm() {
    setNombre(''); setEmail(''); setPassword(''); setRolId(''); setSectoresSel([]);
  }

  async function crear() {
    setError(''); setExito('');
    if (!nombre.trim() || !email.trim() || !password || !rolId) {
      setError('Completá nombre, email, contraseña y rol.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setGuardando(true);
    try {
      await Data.crearUsuarioCompleto({ nombre, email, password, rolId, sectores: sectoresSel });
      setExito(`Usuario "${nombre}" creado correctamente.`);
      limpiarForm();
      cargarTodo();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Ese email ya está registrado.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El email no es válido.');
      } else {
        setError('No se pudo crear el usuario: ' + err.message);
      }
    }
    setGuardando(false);
  }

  function empezarEdicion(u) {
    setEditandoId(u.id);
    setEditNombre(u.nombre || '');
    setEditRolId(u.rolId || '');
    setEditSectores(u.sectores || []);
  }

  async function guardarEdicion(id) {
    if (!editNombre.trim() || !editRolId) return;
    await Data.actualizarUsuario(id, { nombre: editNombre.trim(), rolId: editRolId, sectores: editSectores });
    setEditandoId(null);
    cargarTodo();
  }

  async function toggleActivo(u) {
    if (u.activo === false) {
      await Data.reactivarUsuario(u.id);
    } else {
      if (!confirm(`¿Desactivar a "${u.nombre}"? No va a poder usar el sistema hasta que lo reactives. (Su login en Firebase Auth no se borra; eso se hace desde la consola de Firebase si hace falta.)`)) return;
      await Data.desactivarUsuario(u.id);
    }
    cargarTodo();
  }

  return (
    <div>
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>Nuevo usuario</div>

        <div className="field">
          <label>Nombre y apellido</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María Fernández" />
        </div>
        <div className="field">
          <label>Email (será su usuario para ingresar)</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@empresa.com" />
        </div>
        <div className="field">
          <label>Contraseña inicial</label>
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
        <div className="field">
          <label>Rol</label>
          <select value={rolId} onChange={e => setRolId(e.target.value)}>
            <option value="">Seleccioná un rol…</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Sectores (opcional, puede tener varios)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sectores.map(s => (
              <label key={s.id} className="checkbox-row" style={{ marginBottom: 0 }}>
                <input type="checkbox" checked={sectoresSel.includes(s.id)} onChange={() => toggleSector(s.id)} />
                {s.nombre}
              </label>
            ))}
            {sectores.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>No hay sectores cargados todavía.</span>}
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}
        {exito && <div style={{ color: 'var(--ok)', fontSize: 13, marginBottom: 14 }}>{exito}</div>}

        <button className="btn btn-primary" disabled={guardando} onClick={crear}>
          {guardando ? 'Creando…' : 'Crear usuario'}
        </button>
      </div>

      {errorCarga && <div className="card" style={{ borderColor: 'var(--danger)' }}><span className="error-text" style={{ margin: 0 }}>{errorCarga}</span></div>}

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Sectores</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {(usuarios || []).map(u => (
              editandoId === u.id ? (
                <tr key={u.id}>
                  <td><input value={editNombre} onChange={e => setEditNombre(e.target.value)} style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)' }} /></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.email}</td>
                  <td>
                    <select value={editRolId} onChange={e => setEditRolId(e.target.value)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)' }}>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {sectores.map(s => (
                        <label key={s.id} style={{ fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input type="checkbox" checked={editSectores.includes(s.id)} onChange={() => toggleSectorEdit(s.id)} />
                          {s.nombre}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>{u.activo === false ? <span className="badge badge-danger">Inactivo</span> : <span className="badge badge-ok">Activo</span>}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => guardarEdicion(u.id)}>Guardar</button>
                    <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setEditandoId(null)}>Cancelar</button>
                  </td>
                </tr>
              ) : (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.email}</td>
                  <td>{nombreRol(u.rolId)}</td>
                  <td>{(u.sectores || []).length}</td>
                  <td>{u.activo === false ? <span className="badge badge-danger">Inactivo</span> : <span className="badge badge-ok">Activo</span>}</td>
                  <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => empezarEdicion(u)}>Editar</button>
                    <button className={u.activo === false ? 'btn btn-primary' : 'btn btn-danger'} style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => toggleActivo(u)}>
                      {u.activo === false ? 'Reactivar' : 'Desactivar'}
                    </button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
        {usuarios && usuarios.length === 0 && <div className="empty-state">Todavía no hay usuarios cargados.</div>}
      </div>
    </div>
  );
}
