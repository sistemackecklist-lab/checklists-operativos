/* ============================================================
   MI CHECKLIST
   Pantalla donde el usuario responde las preguntas de su rol
   para el turno actual (AM/PM). Un "No" exige motivo obligatorio
   antes de poder guardar.

   Si el usuario tiene más de un sector asignado, primero elige
   con cuál de ellos quiere trabajar: cada sector tiene sus propias
   preguntas y se completa como un checklist separado (uno por
   sector, por turno).
   ============================================================ */

function ChecklistScreen({ usuario }) {
  const tieneSectores = usuario.sectores && usuario.sectores.length > 0;
  const [sectorId, setSectorId] = React.useState(
    usuario.sectores && usuario.sectores.length === 1 ? usuario.sectores[0] : null
  );
  const [nombresSectores, setNombresSectores] = React.useState({});
  const [estadoSectores, setEstadoSectores] = React.useState(null); // { sectorId: bool completado }

  const momento = Data.getMomentoActual();

  // Cargar nombres de sectores + estado de completitud de cada uno del usuario
  React.useEffect(() => {
    async function cargar() {
      const todos = await Data.getSectores();
      const mapa = {};
      todos.forEach(s => { mapa[s.id] = s.nombre; });
      setNombresSectores(mapa);

      if (tieneSectores && usuario.sectores.length > 1) {
        const estados = {};
        await Promise.all(usuario.sectores.map(async (sid) => {
          estados[sid] = await Data.yaCompletoHoy(usuario.id, momento, sid);
        }));
        setEstadoSectores(estados);
      }
    }
    cargar();
  }, [usuario.id]);

  // Paso 1: si tiene más de un sector y todavía no eligió cuál, mostrar el selector
  if (tieneSectores && usuario.sectores.length > 1 && !sectorId) {
    return (
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
          Elegí el sector
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16 }}>
          Tenés más de un sector asignado. Cada uno tiene su propio checklist para este turno ({momento}).
        </div>

        {estadoSectores === null && <div className="spinner-row">Cargando…</div>}

        {estadoSectores && usuario.sectores.map(sid => {
          const completo = estadoSectores[sid];
          return (
            <button
              key={sid}
              onClick={() => setSectorId(sid)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', textAlign: 'left', padding: '16px 14px', marginBottom: 10,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600
              }}
            >
              <span>{nombresSectores[sid] || sid}</span>
              {completo
                ? <span className="badge badge-ok">✓ Completado</span>
                : <span className="badge badge-danger">Pendiente</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <ChecklistDeSector
      usuario={usuario}
      sectorId={sectorId}
      nombreSector={sectorId ? (nombresSectores[sectorId] || '') : ''}
      momento={momento}
      mostrarVolver={tieneSectores && usuario.sectores.length > 1}
      onVolver={() => setSectorId(null)}
    />
  );
}

// Checklist de UN sector puntual (o del rol, si no tiene sector).
function ChecklistDeSector({ usuario, sectorId, nombreSector, momento, mostrarVolver, onVolver }) {
  const [preguntas, setPreguntas] = React.useState(null);
  const [respuestas, setRespuestas] = React.useState({});
  const [yaCompletado, setYaCompletado] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [guardadoOk, setGuardadoOk] = React.useState(false);

  React.useEffect(() => {
    async function cargar() {
      setPreguntas(null);
      setRespuestas({});
      setGuardadoOk(false);
      const [preg, completo] = await Promise.all([
        Data.getPreguntasPorRolYSector(usuario.rolId, sectorId),
        Data.yaCompletoHoy(usuario.id, momento, sectorId)
      ]);
      setPreguntas(preg);
      setYaCompletado(completo);
    }
    cargar();
  }, [usuario.id, sectorId]);

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

  const todasRespondidas = preguntas && preguntas.length > 0 && preguntas.every(p => respuestas[p.id]?.respuesta);
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

  const encabezadoSector = nombreSector && (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}>
        Sector: <strong style={{ color: 'var(--text)', marginLeft: 4 }}>{nombreSector}</strong>
      </div>
      {mostrarVolver && (
        <button className="btn btn-ghost" onClick={onVolver}>← Cambiar de sector</button>
      )}
    </div>
  );

  if (preguntas === null) {
    return <div className="spinner-row">Cargando checklist…</div>;
  }

  if (preguntas.length === 0) {
    return (
      <div>
        {encabezadoSector}
        <div className="empty-state">
          Todavía no hay preguntas configuradas para tu rol{nombreSector ? ` en el sector ${nombreSector}` : ''}.<br />
          Pedile a un administrador que las cargue en <strong>Administración → Preguntas</strong>.
        </div>
      </div>
    );
  }

  if (yaCompletado) {
    return (
      <div>
        {encabezadoSector}
        <div className="card">
          <span className="badge badge-ok">✓ Turno {momento} completado</span>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 12 }}>
            Ya registraste el checklist de este turno{nombreSector ? ` para ${nombreSector}` : ''}. El próximo control corresponde
            al turno {momento === 'AM' ? 'de la tarde (PM)' : 'de mañana (AM)'}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {encabezadoSector}

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
          disabled={!puedeGuardar}
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
