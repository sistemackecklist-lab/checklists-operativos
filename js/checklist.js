/* ============================================================
   MI CHECKLIST
   Pantalla donde el usuario responde las preguntas de su rol
   para el turno actual (AM/PM). Un "No" exige motivo obligatorio
   antes de poder guardar.
   ============================================================ */

function ChecklistScreen({ usuario }) {
  const [preguntas, setPreguntas] = React.useState(null);
  const [sectores, setSectores] = React.useState([]);
  const [sectorId, setSectorId] = React.useState('');
  const [respuestas, setRespuestas] = React.useState({}); // { preguntaId: {respuesta, motivo} }
  const [yaCompletado, setYaCompletado] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [guardadoOk, setGuardadoOk] = React.useState(false);

  const momento = Data.getMomentoActual();

  React.useEffect(() => {
    async function cargar() {
      const [preg, secs, completo] = await Promise.all([
        Data.getPreguntasPorRol(usuario.rolId),
        Data.getSectores(),
        Data.yaCompletoHoy(usuario.id, momento)
      ]);
      setPreguntas(preg);
      setSectores(secs);
      setYaCompletado(completo);
      if (usuario.sectores && usuario.sectores.length === 1) {
        setSectorId(usuario.sectores[0]);
      }
    }
    cargar();
  }, [usuario.id]);

  function setRespuesta(preguntaId, valor) {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: { respuesta: valor, motivo: prev[preguntaId]?.motivo || '' }
    }));
  }

  function setMotivo(preguntaId, motivo) {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: { ...prev[preguntaId], motivo }
    }));
  }

  const todasRespondidas = preguntas && preguntas.every(p => respuestas[p.id]?.respuesta);
  const motivosCompletos = preguntas && preguntas.every(p => {
    const r = respuestas[p.id];
    if (!r || r.respuesta !== 'no') return true;
    return r.motivo && r.motivo.trim().length > 0;
  });
  const puedeGuardar = todasRespondidas && motivosCompletos && !guardando;

  async function handleGuardar() {
    setGuardando(true);
    const payload = preguntas.map(p => ({
      preguntaId: p.id,
      textoPregunta: p.texto,
      respuesta: respuestas[p.id].respuesta,
      motivo: respuestas[p.id].respuesta === 'no' ? respuestas[p.id].motivo.trim() : null
    }));
    await Data.guardarChecklist({ usuario, sectorId, respuestas: payload });
    setGuardando(false);
    setGuardadoOk(true);
    setYaCompletado(true);
  }

  if (preguntas === null) {
    return <div className="spinner-row">Cargando checklist…</div>;
  }

  if (preguntas.length === 0) {
    return (
      <div className="empty-state">
        Todavía no hay preguntas configuradas para tu rol.<br />
        Pedile a un administrador que las cargue en <strong>Administración → Preguntas</strong>.
      </div>
    );
  }

  if (yaCompletado) {
    return (
      <div className="card">
        <span className="badge badge-ok">✓ Turno {momento} completado</span>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 12 }}>
          Ya registraste el checklist de este turno. El próximo control corresponde
          al turno {momento === 'AM' ? 'de la tarde (PM)' : 'de mañana (AM)'}.
        </p>
      </div>
    );
  }

  return (
    <div>
      {sectores.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Sector</label>
            <select value={sectorId} onChange={e => setSectorId(e.target.value)}>
              <option value="">Seleccioná un sector…</option>
              {sectores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="card">
        {preguntas.map(p => {
          const r = respuestas[p.id];
          return (
            <div key={p.id} className="checklist-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div className="checklist-item-text">{p.texto}</div>
                <div className="toggle-switch">
                  <button
                    className={'si' + (r?.respuesta === 'si' ? ' selected' : '')}
                    onClick={() => setRespuesta(p.id, 'si')}
                  >SÍ</button>
                  <button
                    className={'no' + (r?.respuesta === 'no' ? ' selected' : '')}
                    onClick={() => setRespuesta(p.id, 'no')}
                  >NO</button>
                </div>
              </div>

              {r?.respuesta === 'no' && (
                <div className="motivo-box">
                  <span className="motivo-label">Motivo obligatorio</span>
                  <textarea
                    placeholder="Explicá brevemente por qué…"
                    value={r.motivo}
                    onChange={e => setMotivo(p.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="btn btn-primary"
          disabled={!puedeGuardar || (sectores.length > 0 && !sectorId)}
          onClick={handleGuardar}
        >
          {guardando ? 'Guardando…' : `Guardar checklist ${momento}`}
        </button>
        {!todasRespondidas && (
          <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>Respondé todas las preguntas para poder guardar.</span>
        )}
      </div>
    </div>
  );
}
