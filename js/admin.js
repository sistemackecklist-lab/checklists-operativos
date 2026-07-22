/* ============================================================
   ADMINISTRACIÓN — gestión de Roles, Sectores, Preguntas y
   Usuarios. Visible solo para roles con el permiso correspon-
   diente (ver app.js / permisos del rol).
   ============================================================ */

function AdminScreen({ usuario }) {
  const [tab, setTab] = React.useState('roles');
  const [rolUsuario, setRolUsuario] = React.useState(null);

  React.useEffect(() => { Data.getRol(usuario.rolId).then(setRolUsuario); }, [usuario.rolId]);

  const puedeVerMantenimiento = rolUsuario && rolUsuario.permisos && rolUsuario.permisos.administrarRoles;

  const tabs = [
    { id: 'roles', label: 'Roles' },
    { id: 'sectores', label: 'Sectores' },
    { id: 'preguntas', label: 'Preguntas' },
    { id: 'usuarios', label: 'Usuarios' },
    ...(puedeVerMantenimiento ? [{ id: 'mantenimiento', label: '⚠ Mantenimiento' }] : [])
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
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
      {tab === 'mantenimiento' && puedeVerMantenimiento && <AdminMantenimiento />}
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
  const [sectores, setSectores] = React.useState([]);
  const [rolId, setRolId] = React.useState('');
  const [sectorId, setSectorId] = React.useState(''); // '' = todavía no elegido, 'general' = sin sector
  const [momento, setMomento] = React.useState(''); // '' = todavía no elegido, 'AM' o 'PM'
  const [preguntas, setPreguntas] = React.useState(null);
  const [texto, setTexto] = React.useState('');

  const [sinConfigurar, setSinConfigurar] = React.useState(null);
  const [asignando, setAsignando] = React.useState({}); // { preguntaId: { sectorId, momento } }
  const [replicando, setReplicando] = React.useState(null); // id de la pregunta que se está replicando
  const [mensajeReplicado, setMensajeReplicado] = React.useState('');
  const [preguntasDelRol, setPreguntasDelRol] = React.useState([]); // todas las activas del rol+momento, en cualquier sector
  const [editandoId, setEditandoId] = React.useState(null);
  const [editTexto, setEditTexto] = React.useState('');
  const [verDesactivadas, setVerDesactivadas] = React.useState(false);
  // Guardia inmediata (no depende de que React vuelva a renderizar) para
  // que un doble clic muy rápido en "Replicar" no dispare dos copias.
  const replicandoRef = React.useRef(new Set());

  React.useEffect(() => {
    Data.getRoles().then(setRoles);
    Data.getSectores().then(setSectores);
  }, []);

  async function cargarPreguntas(rid, sid, mom) {
    if (!rid || !sid || !mom) { setPreguntas(null); return; }
    setPreguntas(await Data.getPreguntasAdmin(rid, sid === 'general' ? null : sid, mom));
  }

  async function cargarPreguntasDelRol(rid, mom) {
    if (!rid || !mom) { setPreguntasDelRol([]); return; }
    setPreguntasDelRol(await Data.getPreguntasActivasPorRol(rid, mom));
  }

  async function cargarSinConfigurar(rid) {
    if (!rid) { setSinConfigurar(null); return; }
    setSinConfigurar(await Data.getPreguntasSinConfigurar(rid));
  }

  React.useEffect(() => { setSectorId(''); setMomento(''); cargarSinConfigurar(rolId); }, [rolId]);
  React.useEffect(() => { cargarPreguntasDelRol(rolId, momento); }, [rolId, momento]);
  React.useEffect(() => { cargarPreguntas(rolId, sectorId, momento); setMensajeReplicado(''); setVerDesactivadas(false); }, [rolId, sectorId, momento]);

  // Cuántos sectores distintos (contando "General") ya tienen una pregunta
  // ACTIVA con este mismo texto, para el mismo rol y el mismo momento.
  function sectoresConEstaPregunta(texto) {
    const normalizado = texto.trim().toLowerCase();
    const claves = new Set(
      preguntasDelRol
        .filter(p => p.texto.trim().toLowerCase() === normalizado)
        .map(p => p.sectorId || 'general')
    );
    return claves;
  }
  const totalSectoresPosibles = sectores.length + 1; // + "General"

  async function migrarPregunta(preguntaId, faltaSector, faltaMomento) {
    const elegido = asignando[preguntaId] || {};
    if (faltaSector && !elegido.sectorId) return;
    if (faltaMomento && !elegido.momento) return;
    await Data.completarConfiguracionPregunta(preguntaId, {
      sectorId: faltaSector ? (elegido.sectorId === 'general' ? null : elegido.sectorId) : undefined,
      momento: faltaMomento ? elegido.momento : undefined
    });
    await cargarSinConfigurar(rolId);
    if (sectorId && momento) cargarPreguntas(rolId, sectorId, momento);
  }

  async function agregar() {
    if (!texto.trim() || !rolId || !sectorId || !momento) return;
    const orden = (preguntas || []).length;
    await Data.crearPregunta({ rolId, sectorId: sectorId === 'general' ? null : sectorId, momento, texto: texto.trim(), orden });
    setTexto('');
    cargarPreguntas(rolId, sectorId, momento);
    cargarPreguntasDelRol(rolId, momento);
  }

  async function desactivar(id) {
    await Data.desactivarPregunta(id);
    cargarPreguntas(rolId, sectorId, momento);
    cargarPreguntasDelRol(rolId, momento);
  }

  async function reactivar(id) {
    await Data.reactivarPregunta(id);
    cargarPreguntas(rolId, sectorId, momento);
    cargarPreguntasDelRol(rolId, momento);
  }

  function empezarEdicion(p) {
    setEditandoId(p.id);
    setEditTexto(p.texto);
  }

  async function guardarEdicion(id) {
    if (!editTexto.trim()) return;
    await Data.actualizarTextoPregunta(id, editTexto);
    setEditandoId(null);
    cargarPreguntas(rolId, sectorId, momento);
    cargarPreguntasDelRol(rolId, momento);
  }

  async function replicar(pregunta) {
    if (replicandoRef.current.has(pregunta.id)) return; // ya hay una replicación de esta pregunta en curso
    replicandoRef.current.add(pregunta.id);
    setReplicando(pregunta.id);
    setMensajeReplicado('');
    try {
      const sectorIds = sectores.map(s => s.id);
      const { creadas, saltadas } = await Data.replicarPreguntaATodosLosSectores(pregunta, sectorIds);
      setMensajeReplicado(
        creadas > 0
          ? `Replicada a ${creadas} sector${creadas === 1 ? '' : 'es'} nuevo${creadas === 1 ? '' : 's'} (turno ${pregunta.momento})` +
            (saltadas > 0 ? ` — ya existía en ${saltadas}.` : '.')
          : `Ya existía en todos los sectores para el turno ${pregunta.momento}, no se creó ninguna copia nueva.`
      );
      cargarPreguntas(rolId, sectorId, momento);
      cargarPreguntasDelRol(rolId, momento);
    } finally {
      replicandoRef.current.delete(pregunta.id);
      setReplicando(null);
    }
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
          <div className="field">
            <label>Turno</label>
            <select value={momento} onChange={e => setMomento(e.target.value)}>
              <option value="">Seleccioná un turno…</option>
              <option value="AM">Mañana (AM)</option>
              <option value="PM">Tarde (PM)</option>
            </select>
          </div>
        )}

        {rolId && momento && (
          <div className="field">
            <label>Sector</label>
            <select value={sectorId} onChange={e => setSectorId(e.target.value)}>
              <option value="">Seleccioná un sector…</option>
              {sectores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              <option value="general">— General (sin sector) —</option>
            </select>
          </div>
        )}

        {rolId && momento && sectorId && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Texto de la nueva pregunta"
                   style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text)' }} />
            <button className="btn btn-primary" onClick={agregar} disabled={!texto.trim()}>Agregar</button>
          </div>
        )}
      </div>

      {rolId && sinConfigurar && sinConfigurar.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4, color: 'var(--accent)' }}>
            ⚠️ Preguntas antiguas de este rol sin configurar del todo
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 14 }}>
            Estas preguntas se cargaron antes de que existiera la separación por sector y/o por turno
            (AM/PM), por eso no aparecen en ningún checklist ahora. Completá lo que falte de cada una
            para que vuelvan a estar activas.
          </div>
          {sinConfigurar.map(p => {
            const faltaSector = p.sectorId === undefined;
            const faltaMomento = p.momento === undefined;
            const elegido = asignando[p.id] || {};
            const puedeAsignar = (!faltaSector || elegido.sectorId) && (!faltaMomento || elegido.momento);
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, minWidth: 200 }}>{p.texto}</span>

                {faltaMomento && (
                  <select
                    value={elegido.momento || ''}
                    onChange={e => setAsignando(prev => ({ ...prev, [p.id]: { ...prev[p.id], momento: e.target.value } }))}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)' }}
                  >
                    <option value="">Turno…</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                )}

                {faltaSector && (
                  <select
                    value={elegido.sectorId || ''}
                    onChange={e => setAsignando(prev => ({ ...prev, [p.id]: { ...prev[p.id], sectorId: e.target.value } }))}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)' }}
                  >
                    <option value="">Sector…</option>
                    {sectores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    <option value="general">General (sin sector)</option>
                  </select>
                )}

                <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }}
                        disabled={!puedeAsignar} onClick={() => migrarPregunta(p.id, faltaSector, faltaMomento)}>
                  Asignar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {rolId && momento && sectorId && (
        <div className="card">
          {mensajeReplicado && (
            <div style={{ color: 'var(--ok)', fontSize: 13, marginBottom: 12 }}>{mensajeReplicado}</div>
          )}
          {preguntas === null && <div className="spinner-row">Cargando…</div>}
          {preguntas && preguntas.filter(p => p.activa).map(p => {
            const enSectores = sectoresConEstaPregunta(p.texto);
            const enTodos = enSectores.size >= totalSectoresPosibles;

            if (editandoId === p.id) {
              return (
                <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <input value={editTexto} onChange={e => setEditTexto(e.target.value)} autoFocus
                         style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)' }} />
                  <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }}
                          disabled={!editTexto.trim()} onClick={() => guardarEdicion(p.id)}>Guardar</button>
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setEditandoId(null)}>Cancelar</button>
                </div>
              );
            }

            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ flex: 1 }}>
                  <div>{p.texto}</div>
                  {enTodos ? (
                    <span className="badge badge-ok" style={{ marginTop: 4 }}>✓ Replicada en todos los sectores ({momento})</span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      En {enSectores.size} de {totalSectoresPosibles} sectores (turno {momento})
                    </span>
                  )}
                </div>
                {!enTodos && (
                  <button className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }}
                          disabled={replicando === p.id} onClick={() => replicar(p)}
                          title={`Crea esta misma pregunta en los demás sectores de este rol, para el turno ${momento} (si todavía no la tienen)`}>
                    {replicando === p.id ? 'Replicando…' : '⧉ Replicar a todos los sectores'}
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => empezarEdicion(p)}>Editar</button>
                <button className="btn btn-ghost" onClick={() => desactivar(p.id)}>Desactivar</button>
              </div>
            );
          })}
          {preguntas && preguntas.filter(p => p.activa).length === 0 && (
            <div className="empty-state">Este rol todavía no tiene preguntas activas para este sector y este turno.</div>
          )}

          {preguntas && preguntas.filter(p => !p.activa).length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
              <button className="btn btn-ghost" onClick={() => setVerDesactivadas(v => !v)}>
                {verDesactivadas ? '▾' : '▸'} Preguntas desactivadas ({preguntas.filter(p => !p.activa).length})
              </button>

              {verDesactivadas && preguntas.filter(p => !p.activa).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-soft)', marginTop: 10 }}>
                  <span style={{ flex: 1, color: 'var(--text-faint)' }}>{p.texto}</span>
                  <button className="btn btn-primary" onClick={() => reactivar(p.id)}>Reactivar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- MANTENIMIENTO (zona de riesgo) ---------------- */

function AdminMantenimiento() {
  const [confirmacion, setConfirmacion] = React.useState('');
  const [borrando, setBorrando] = React.useState(false);
  const [resultado, setResultado] = React.useState('');

  const FRASE = 'BORRAR TODO';

  async function ejecutarBorrado() {
    if (confirmacion !== FRASE) return;
    setBorrando(true);
    setResultado('');
    try {
      const [preguntas, checklists, acciones] = await Promise.all([
        Data.vaciarColeccion('preguntas'),
        Data.vaciarColeccion('checklists_instancias'),
        Data.vaciarColeccion('acciones_correctivas')
      ]);
      setResultado(
        `Listo. Se borraron ${preguntas} preguntas, ${checklists} checklists y ${acciones} acciones correctivas. ` +
        `Roles, sectores y usuarios NO se tocaron.`
      );
      setConfirmacion('');
    } catch (err) {
      console.error('Error en el borrado masivo:', err);
      setResultado('Ocurrió un error al borrar — revisá la consola (F12). Puede que se haya borrado solo una parte.');
    }
    setBorrando(false);
  }

  return (
    <div>
      <div className="card" style={{ borderColor: 'var(--danger)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>
          ⚠ Borrar preguntas, checklists y acciones correctivas
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 6 }}>
          Esto borra <strong>permanentemente</strong> y sin posibilidad de deshacer:
        </div>
        <ul style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14, paddingLeft: 20 }}>
          <li>Todas las <strong>preguntas</strong> (de todos los roles, sectores y turnos)</li>
          <li>Todo el <strong>historial de checklists</strong> completados</li>
          <li>Todas las <strong>acciones correctivas</strong> (pendientes y resueltas)</li>
        </ul>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
          <strong>NO se borran</strong> los roles, los sectores ni los usuarios — esa configuración queda intacta.
          Usalo para arrancar de cero antes de salir a producción, o para limpiar datos de prueba.
        </div>

        <div className="field">
          <label>Para confirmar, escribí exactamente: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{FRASE}</span></label>
          <input value={confirmacion} onChange={e => setConfirmacion(e.target.value)} placeholder={FRASE} />
        </div>

        <button
          className="btn btn-danger"
          disabled={confirmacion !== FRASE || borrando}
          onClick={ejecutarBorrado}
        >
          {borrando ? 'Borrando…' : 'Borrar todo definitivamente'}
        </button>

        {resultado && (
          <div style={{ marginTop: 14, fontSize: 13, color: resultado.startsWith('Listo') ? 'var(--ok)' : 'var(--danger)' }}>
            {resultado}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [verPanelCompleto, setVerPanelCompleto] = React.useState(true);
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState('');
  const [exito, setExito] = React.useState('');

  // Edición de un usuario existente
  const [editandoId, setEditandoId] = React.useState(null);
  const [editNombre, setEditNombre] = React.useState('');
  const [editRolId, setEditRolId] = React.useState('');
  const [editSectores, setEditSectores] = React.useState([]);
  const [editVerPanelCompleto, setEditVerPanelCompleto] = React.useState(true);

  // Filtros de la tabla
  const [filtroTexto, setFiltroTexto] = React.useState('');
  const [filtroRol, setFiltroRol] = React.useState('');
  const [filtroEstado, setFiltroEstado] = React.useState('activos'); // activos | inactivos | todos

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

  const usuariosFiltrados = (usuarios || []).filter(u => {
    if (filtroEstado === 'activos' && u.activo === false) return false;
    if (filtroEstado === 'inactivos' && u.activo !== false) return false;
    if (filtroRol && u.rolId !== filtroRol) return false;
    if (filtroTexto.trim()) {
      const q = filtroTexto.trim().toLowerCase();
      const coincide = (u.nombre || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      if (!coincide) return false;
    }
    return true;
  });

  function toggleSector(id) {
    setSectoresSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleSectorEdit(id) {
    setEditSectores(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function limpiarForm() {
    setNombre(''); setEmail(''); setPassword(''); setRolId(''); setSectoresSel([]); setVerPanelCompleto(true);
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
      await Data.crearUsuarioCompleto({ nombre, email, password, rolId, sectores: sectoresSel, verPanelCompleto });
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
    setEditVerPanelCompleto(u.verPanelCompleto !== false);
  }

  async function guardarEdicion(id) {
    if (!editNombre.trim() || !editRolId) return;
    await Data.actualizarUsuario(id, { nombre: editNombre.trim(), rolId: editRolId, sectores: editSectores, verPanelCompleto: editVerPanelCompleto });
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
        <div className="field">
          <label className="checkbox-row" style={{ marginBottom: 0 }}>
            <input type="checkbox" checked={verPanelCompleto} onChange={e => setVerPanelCompleto(e.target.checked)} />
            Puede ver el Panel de todo su equipo (no solo su propio historial)
          </label>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', display: 'block', marginTop: 4 }}>
            Solo aplica si el rol tiene acceso al Panel. Desmarcado, esta persona solo va a ver sus propios checklists y casos, aunque el rol permita supervisar.
          </span>
        </div>

        {error && <div className="error-text">{error}</div>}
        {exito && <div style={{ color: 'var(--ok)', fontSize: 13, marginBottom: 14 }}>{exito}</div>}

        <button className="btn btn-primary" disabled={guardando} onClick={crear}>
          {guardando ? 'Creando…' : 'Crear usuario'}
        </button>
      </div>

      {errorCarga && <div className="card" style={{ borderColor: 'var(--danger)' }}><span className="error-text" style={{ margin: 0 }}>{errorCarga}</span></div>}

      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0, flex: '1 1 220px' }}>
          <label>Buscar</label>
          <input value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} placeholder="Nombre o email…" />
        </div>
        <div className="field" style={{ margin: 0, flex: '1 1 180px' }}>
          <label>Rol</label>
          <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
            <option value="">Todos los roles</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0, flex: '1 1 160px' }}>
          <label>Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        {(filtroTexto || filtroRol || filtroEstado !== 'activos') && (
          <button className="btn btn-ghost" onClick={() => { setFiltroTexto(''); setFiltroRol(''); setFiltroEstado('activos'); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 10 }}>
          Mostrando {usuariosFiltrados.length} de {(usuarios || []).length} usuarios
        </div>
        <table className="data-table">
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Sectores</th><th>Panel</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {usuariosFiltrados.map(u => (
              editandoId === u.id ? (
                <tr key={u.id}>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <div style={{ padding: '18px 4px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', margin: '6px 0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 14 }}>
                        <div className="field" style={{ margin: 0 }}>
                          <label>Nombre y apellido</label>
                          <input value={editNombre} onChange={e => setEditNombre(e.target.value)} />
                        </div>
                        <div className="field" style={{ margin: 0 }}>
                          <label>Email</label>
                          <input value={u.email} disabled style={{ opacity: 0.6 }} />
                        </div>
                        <div className="field" style={{ margin: 0 }}>
                          <label>Rol</label>
                          <select value={editRolId} onChange={e => setEditRolId(e.target.value)}>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                          </select>
                        </div>
                        <div className="field" style={{ margin: 0 }}>
                          <label>Sectores</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                            {sectores.map(s => (
                              <label key={s.id} style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input type="checkbox" checked={editSectores.includes(s.id)} onChange={() => toggleSectorEdit(s.id)} />
                                {s.nombre}
                              </label>
                            ))}
                            {sectores.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>No hay sectores cargados.</span>}
                          </div>
                        </div>
                      </div>

                      <label className="checkbox-row" style={{ marginBottom: 16 }}>
                        <input type="checkbox" checked={editVerPanelCompleto} onChange={e => setEditVerPanelCompleto(e.target.checked)} />
                        Puede ver el Panel de todo su equipo (no solo su propio historial)
                      </label>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" onClick={() => guardarEdicion(u.id)}>Guardar</button>
                        <button className="btn btn-ghost" onClick={() => setEditandoId(null)}>Cancelar</button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.email}</td>
                  <td>{nombreRol(u.rolId)}</td>
                  <td>{(u.sectores || []).length}</td>
                  <td>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {u.verPanelCompleto === false ? 'Solo propio' : 'Equipo'}
                    </span>
                  </td>
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
        {usuarios && usuarios.length > 0 && usuariosFiltrados.length === 0 && (
          <div className="empty-state">Ningún usuario coincide con los filtros aplicados.</div>
        )}
      </div>
    </div>
  );
}
