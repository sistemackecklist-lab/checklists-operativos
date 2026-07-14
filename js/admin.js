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

  async function cargar() {
    setRoles(await Data.getRoles());
  }
  React.useEffect(() => { cargar(); }, []);

  function togglePermiso(key) {
    setPermisos(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function crear() {
    if (!nombre.trim()) return;
    setGuardando(true);
    await Data.crearRol({ nombre: nombre.trim(), descripcion, rolSuperiorId: rolSuperiorId || null, permisos });
    setNombre(''); setDescripcion(''); setRolSuperiorId(''); setPermisos({});
    setGuardando(false);
    cargar();
  }

  return (
    <div>
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>Nuevo rol</div>
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
            {(roles || []).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
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
        <button className="btn btn-primary" disabled={guardando || !nombre.trim()} onClick={crear}>
          {guardando ? 'Creando…' : 'Crear rol'}
        </button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>Rol</th><th>Reporta a</th><th>Permisos</th></tr>
          </thead>
          <tbody>
            {(roles || []).map(r => (
              <tr key={r.id}>
                <td>{r.nombre}</td>
                <td>{(roles.find(x => x.id === r.rolSuperiorId) || {}).nombre || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  {Object.entries(r.permisos || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || '—'}
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
  const [nombre, setNombre] = React.useState('');

  async function cargar() { setSectores(await Data.getSectores()); }
  React.useEffect(() => { cargar(); }, []);

  async function crear() {
    if (!nombre.trim()) return;
    await Data.crearSector(nombre.trim());
    setNombre('');
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
      <div className="card">
        {(sectores || []).map(s => (
          <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>{s.nombre}</div>
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

  // Formulario de alta
  const [nombre, setNombre] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rolId, setRolId] = React.useState('');
  const [sectoresSel, setSectoresSel] = React.useState([]);
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState('');
  const [exito, setExito] = React.useState('');

  async function cargarTodo() {
    const [u, r, s] = await Promise.all([Data.getUsuarios(), Data.getRoles(), Data.getSectores()]);
    setUsuarios(u); setRoles(r); setSectores(s);
  }
  React.useEffect(() => { cargarTodo(); }, []);

  function nombreRol(id) {
    return (roles.find(r => r.id === id) || {}).nombre || '—';
  }

  function toggleSector(id) {
    setSectoresSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Sectores</th></tr></thead>
          <tbody>
            {(usuarios || []).map(u => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.email}</td>
                <td>{nombreRol(u.rolId)}</td>
                <td>{(u.sectores || []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios && usuarios.length === 0 && <div className="empty-state">Todavía no hay usuarios cargados.</div>}
      </div>
    </div>
  );
}
