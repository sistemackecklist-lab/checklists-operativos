/* ============================================================
   PANEL — vista para supervisores: acciones correctivas
   pendientes (los "No" sin resolver), historial, y métricas
   de cumplimiento con gráficos por fecha y por sector.
   ============================================================ */

// Convierte un Timestamp de Firestore (o Date) a "dd/mm HH:mm"
function formatFechaHora(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Duración legible entre dos Timestamps de Firestore (o Date)
function formatDuracion(desdeTs, hastaTs) {
  if (!desdeTs || !hastaTs) return '—';
  const desde = desdeTs.toDate ? desdeTs.toDate() : new Date(desdeTs);
  const hasta = hastaTs.toDate ? hastaTs.toDate() : new Date(hastaTs);
  const ms = hasta - desde;
  if (ms < 0) return '—';
  const minutos = Math.round(ms / 60000);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const minRestantes = minutos % 60;
  if (horas < 24) return `${horas} h ${minRestantes} min`;
  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  return `${dias} d ${horasRestantes} h`;
}

function DashboardScreen({ usuario }) {
  const [acciones, setAcciones] = React.useState(null);
  const [checklistsHoy, setChecklistsHoy] = React.useState(null);
  const [resueltas, setResueltas] = React.useState(null);
  const [errorHistorial, setErrorHistorial] = React.useState('');
  const [rolIds, setRolIds] = React.useState([usuario.rolId]);

  // Si el usuario tiene verPanelCompleto === false, solo ve sus propios
  // checklists y casos, aunque su rol tenga permiso de supervisar equipo.
  const modoCompleto = usuario.verPanelCompleto !== false;

  React.useEffect(() => {
    async function cargar() {
      const subRoles = modoCompleto ? await Data.getRolesDescendientes(usuario.rolId) : [];
      const idsRoles = [usuario.rolId, ...subRoles.map(r => r.id)];
      setRolIds(idsRoles);

      const pendTodas = await Data.getAccionesPendientes();
      const pend = modoCompleto
        ? pendTodas.filter(a => idsRoles.includes(a.rolId))
        : pendTodas.filter(a => a.usuarioId === usuario.id);
      setAcciones(pend);

      const clRoles = await Data.getChecklistsPorRoles(modoCompleto ? idsRoles : [usuario.rolId], { fecha: Data.getFechaHoy() });
      const cl = modoCompleto ? clRoles : clRoles.filter(c => c.usuarioId === usuario.id);
      setChecklistsHoy(cl);

      try {
        const resueltasTodas = await Data.getAccionesResueltas();
        const res = modoCompleto
          ? resueltasTodas.filter(a => idsRoles.includes(a.rolId))
          : resueltasTodas.filter(a => a.usuarioId === usuario.id);
        setResueltas(res);
      } catch (err) {
        console.error('Error cargando historial de acciones resueltas:', err);
        setErrorHistorial('No se pudo cargar el historial (probablemente falte crear un índice en Firestore — revisá la consola, F12, para el link de creación).');
      }
    }
    cargar();
  }, [usuario.rolId, usuario.id, modoCompleto]);

  const totalRespuestas = (checklistsHoy || []).reduce((acc, c) => acc + c.respuestas.length, 0);
  const totalNegativas = (checklistsHoy || []).reduce(
    (acc, c) => acc + c.respuestas.filter(r => r.respuesta === 'no').length, 0
  );
  const cumplimiento = totalRespuestas ? Math.round(100 * (totalRespuestas - totalNegativas) / totalRespuestas) : null;

  return (
    <div>
      {!modoCompleto && (
        <div className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)', marginBottom: 16 }}>
          Mostrando solo tu propio historial
        </div>
      )}

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
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Reportado: {formatFechaHora(a.creadoEn)}</span>
              <span>Resuelto: {formatFechaHora(a.resueltoEn)}</span>
              <span style={{ color: 'var(--accent)' }}>Tiempo de atención: {formatDuracion(a.creadoEn, a.resueltoEn)}</span>
            </div>
          </div>
        ))}
      </div>

      <MetricasScreen modoCompleto={modoCompleto} usuarioId={usuario.id} rolIds={rolIds} />
    </div>
  );
}

/* ---------------- MÉTRICAS: gráficos por fecha y por sector ---------------- */

function MetricasScreen({ modoCompleto, usuarioId, rolIds }) {
  const hoy = Data.getFechaHoy();
  const hace30dias = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();

  const [desde, setDesde] = React.useState(hace30dias);
  const [hasta, setHasta] = React.useState(hoy);
  const [datos, setDatos] = React.useState(null);
  const [sectores, setSectores] = React.useState([]);
  const [error, setError] = React.useState('');

  const canvasDiaRef = React.useRef(null);
  const canvasSectorRef = React.useRef(null);
  const chartDiaRef = React.useRef(null);
  const chartSectorRef = React.useRef(null);

  React.useEffect(() => { Data.getSectores().then(setSectores); }, []);

  async function cargar() {
    setError('');
    setDatos(null);
    try {
      const todas = await Data.getAccionesEnRango(desde, hasta);
      const filtradas = modoCompleto
        ? todas.filter(a => rolIds.includes(a.rolId))
        : todas.filter(a => a.usuarioId === usuarioId);
      setDatos(filtradas);
    } catch (err) {
      console.error('Error cargando métricas:', err);
      setError('No se pudieron cargar las métricas para ese rango.');
    }
  }
  React.useEffect(() => { cargar(); }, [desde, hasta, modoCompleto, (rolIds || []).join(',')]);

  function nombreSector(id) {
    return (sectores.find(s => s.id === id) || {}).nombre || 'Sin sector';
  }

  // ---- Armar los datasets para los gráficos ----
  React.useEffect(() => {
    if (!datos || !window.Chart) return;

    // Por día: cantidad de casos reportados por fecha
    const porDia = {};
    datos.forEach(a => { porDia[a.fecha] = (porDia[a.fecha] || 0) + 1; });
    const fechasOrdenadas = Object.keys(porDia).sort();

    // Por sector: cantidad de casos por sector
    const porSector = {};
    datos.forEach(a => {
      const s = nombreSector(a.sectorId);
      porSector[s] = (porSector[s] || 0) + 1;
    });

    if (chartDiaRef.current) chartDiaRef.current.destroy();
    if (chartSectorRef.current) chartSectorRef.current.destroy();

    if (canvasDiaRef.current) {
      chartDiaRef.current = new Chart(canvasDiaRef.current, {
        type: 'bar',
        data: {
          labels: fechasOrdenadas,
          datasets: [{
            label: 'Casos reportados',
            data: fechasOrdenadas.map(f => porDia[f]),
            backgroundColor: '#E8A33D'
          }]
        },
        options: chartOptionsBase()
      });
    }

    if (canvasSectorRef.current) {
      chartSectorRef.current = new Chart(canvasSectorRef.current, {
        type: 'bar',
        data: {
          labels: Object.keys(porSector),
          datasets: [{
            label: 'Casos por sector',
            data: Object.values(porSector),
            backgroundColor: '#4C8BF5'
          }]
        },
        options: { ...chartOptionsBase(), indexAxis: 'y' }
      });
    }
  }, [datos, sectores]);

  function chartOptionsBase() {
    return {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9AA3B0', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: '#2E3542' } },
        y: { ticks: { color: '#9AA3B0', font: { family: 'JetBrains Mono', size: 10 }, precision: 0 }, grid: { color: '#2E3542' } }
      }
    };
  }

  // ---- Tiempo promedio de atención (solo casos resueltos en el rango) ----
  const resueltosEnRango = (datos || []).filter(a => a.resuelto && a.creadoEn && a.resueltoEn);
  const promedioMin = resueltosEnRango.length
    ? Math.round(resueltosEnRango.reduce((acc, a) => {
        const desdeD = a.creadoEn.toDate ? a.creadoEn.toDate() : new Date(a.creadoEn);
        const hastaD = a.resueltoEn.toDate ? a.resueltoEn.toDate() : new Date(a.resueltoEn);
        return acc + (hastaD - desdeD) / 60000;
      }, 0) / resueltosEnRango.length)
    : null;

  function formatPromedio(min) {
    if (min === null) return '—';
    if (min < 60) return `${min} min`;
    const horas = Math.floor(min / 60);
    const minRest = Math.round(min % 60);
    if (horas < 24) return `${horas} h ${minRest} min`;
    const dias = Math.floor(horas / 24);
    return `${dias} d ${horas % 24} h`;
  }

  return (
    <div className="card">
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
        Métricas de cumplimiento
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 16 }}>
        Casos reportados y tiempos de atención en el rango seleccionado.
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" onClick={() => { const h = Data.getFechaHoy(); setDesde(h); setHasta(h); }}>Hoy</button>
          <button className="btn btn-ghost" onClick={() => { setDesde(hace30dias); setHasta(hoy); }}>Últimos 30 días</button>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}
      {datos === null && !error && <div className="spinner-row">Cargando…</div>}

      {datos && (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-tile">
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{datos.length}</div>
              <div className="stat-label">Casos reportados</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value" style={{ color: 'var(--ok)' }}>{datos.filter(a => a.resuelto).length}</div>
              <div className="stat-label">Resueltos en el rango</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value" style={{ color: 'var(--info)' }}>{formatPromedio(promedioMin)}</div>
              <div className="stat-label">Tiempo promedio de atención</div>
            </div>
          </div>

          {datos.length === 0 ? (
            <div className="empty-state">No hay casos reportados en este rango de fechas.</div>
          ) : (
            <div className="metrics-chart-grid">
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Por fecha</div>
                <canvas ref={canvasDiaRef} height="180"></canvas>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Por sector</div>
                <canvas ref={canvasSectorRef} height="180"></canvas>
              </div>
            </div>
          )}
        </>
      )}
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
    // resueltoEn real queda en el server; usamos "ahora" como aproximación
    // para que el historial muestre el tiempo de atención sin esperar a recargar.
    onResuelto({ ...accion, ...datos, resuelto: true, resueltoEn: new Date() });
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border-soft)', padding: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
           onClick={() => setAbierto(!abierto)}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{accion.preguntaTexto}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {accion.usuarioNombre} · Reportado {formatFechaHora(accion.creadoEn)}
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
