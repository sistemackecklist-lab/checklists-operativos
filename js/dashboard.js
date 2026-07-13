/* ============================================================
   PANEL — vista para supervisores: acciones correctivas
   pendientes (los "No" sin resolver) + métricas básicas.
   ============================================================ */

function DashboardScreen({ usuario }) {
  const [acciones, setAcciones] = React.useState(null);
  const [checklistsHoy, setChecklistsHoy] = React.useState(null);

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
          <AccionCorrectivaRow key={a.id} accion={a} onResuelto={() => {
            setAcciones(prev => prev.filter(x => x.id !== a.id));
          }} />
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
    await Data.resolverAccion(accion.id, {
      observacionSupervisor: observacion.trim(),
      accionRealizada: accionRealizada.trim()
    });
    setGuardando(false);
    onResuelto();
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
