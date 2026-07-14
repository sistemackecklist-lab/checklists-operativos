/* ============================================================
   PANEL — vista para supervisores: acciones correctivas
   pendientes (los "No" sin resolver) + métricas básicas.
   ============================================================ */

function DashboardScreen({ usuario }) {
  const [acciones, setAcciones] = React.useState(null);
  const [checklistsHoy, setChecklistsHoy] = React.useState(null);
  const [resueltas, setResueltas] = React.useState(null);
  const [errorHistorial, setErrorHistorial] = React.useState('');

  React.useEffect(() => {
    async function cargar() {
      const [pend, subRoles] = await Promise.all([
        Data.getAccionesPendientes(),
        Data.getRolesSubordinados(usuario.rolId)
      ]);
      setAcciones(pend);

      const rolIds = [usuario.rolId, ...subRoles.map(r => r.id)];
      const cl = await Data.getChecklistsPorRoles(rolIds, { fecha: Data.getFechaHoy() });
      setChecklistsHoy(cl);

      try {
        setResueltas(await Data.getAccionesResueltas());
      } catch (err) {
        setErrorHistorial('No se pudo cargar el historial (probablemente falte crear un índice en Firestore — revisá la consola, F12, para el link de creación).');
      }
    }
    cargar();
  }, [usuario.rolId]);

  const totalRespuestas = (checklistsHoy || []).reduce((acc, c) => acc + c.respuestas.length, 0);
  const totalNegativas = (checklistsHoy || []).reduce(
    (acc, c) => acc + c.respuestas.filter(r => r.respuesta === 'no').length, 0
  );
  const cumplimiento = totalRespuestas ? Math.round(100 * (totalRespuestas - totalNegativas) / totalRespuestas) : null;

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {checklistsHoy === null ? '—' : checklistsHoy.length}
          </div>
          <div className="stat-label">Checklists hoy</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {acciones === null ? '—' : acciones.length}
          </div>
          <div className="stat-label">Acciones pendientes</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: 'var(--ok)' }}>
            {cumplimiento === null ? '—' : cumplimiento + '%'}
          </div>
          <div className="stat-label">Cumplimiento de hoy</div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>
          Acciones correctivas pendientes
        </div>

        {acciones === null && <div className="spinner-row">Cargando…</div>}
        {acciones && acciones.length === 0 && (
          <div className="empty-state">No hay respuestas negativas sin resolver. 👍</div>
        )}
        {acciones && acciones.map(a => (
          <AccionCorrectivaRow key={a.id} accion={a} onResuelto={(accionResuelta) => {
            setAcciones(prev => prev.filter(x => x.id !== a.id));
            setResueltas(prev => prev ? [accionResuelta, ...prev] : [accionResuelta]);
          }} />
        ))}
      </div>

      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
          Historial de resoluciones
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 12 }}>
          Últimos casos ya revisados y cerrados.
        </div>

        {errorHistorial && <div className="error-text" style={{ margin: '0 0 12px 0' }}>{errorHistorial}</div>}
        {resueltas === null && !errorHistorial && <div className="spinner-row">Cargando…</div>}
        {resueltas && resueltas.length === 0 && (
          <div className="empty-state">Todavía no hay casos resueltos.</div>
        )}
        {resueltas && resueltas.map(a => (
          <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.preguntaTexto}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {a.usuarioNombre} · {a.fecha}
                </div>
              </div>
              <span className="badge badge-ok">✓ Resuelto</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>
              <div><strong style={{ color: 'var(--text)' }}>Motivo:</strong> {a.motivoInformado}</div>
              {a.observacionSupervisor && <div style={{ marginTop: 4 }}><strong style={{ color: 'var(--text)' }}>Observación:</strong> {a.observacionSupervisor}</div>}
              {a.accionRealizada && <div style={{ marginTop: 4 }}><strong style={{ color: 'var(--text)' }}>Acción realizada:</strong> {a.accionRealizada}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccionCorrectivaRow({ accion, onResuelto }) {
  const [abierto, setAbierto] = React.useState(false);
  const [observacion, setObservacion] = React.useState('');
  const [accionRealizada, setAccionRealizada] = React.useState('');
  const [guardando, setGuardando] = React.useState(false);

  async function resolver() {
    setGuardando(true);
    const datos = {
      observacionSupervisor: observacion.trim(),
      accionRealizada: accionRealizada.trim()
    };
    await Data.resolverAccion(accion.id, datos);
    setGuardando(false);
    onResuelto({ ...accion, ...datos, resuelto: true });
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border-soft)', padding: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
           onClick={() => setAbierto(!abierto)}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{accion.preguntaTexto}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {accion.usuarioNombre} · {accion.fecha}
          </div>
        </div>
        <span className="badge badge-danger">NO</span>
      </div>

      {abierto && (
        <div style={{ marginTop: 12, paddingLeft: 4 }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
            <strong style={{ color: 'var(--text)' }}>Motivo informado:</strong> {accion.motivoInformado}
          </div>
          <div className="field">
            <label>Observación del supervisor</label>
            <input value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="¿Qué se revisó?" />
          </div>
          <div className="field">
            <label>Acción correctiva realizada</label>
            <input value={accionRealizada} onChange={e => setAccionRealizada(e.target.value)} placeholder="¿Qué se hizo al respecto?" />
          </div>
          <button className="btn btn-primary" disabled={guardando} onClick={resolver}>
            {guardando ? 'Guardando…' : 'Marcar como resuelto'}
          </button>
        </div>
      )}
    </div>
  );
}
