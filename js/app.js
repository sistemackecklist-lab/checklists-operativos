/* ============================================================
   APP — punto de entrada. Maneja el estado de sesión y decide
   qué pantalla mostrar según el usuario y sus permisos de rol.
   ============================================================ */

function App() {
  const [authUser, setAuthUser] = React.useState(undefined); // undefined = cargando, null = sin sesión
  const [usuario, setUsuario] = React.useState(null); // documento de /usuarios
  const [rol, setRol] = React.useState(null);
  const [pantalla, setPantalla] = React.useState('checklist');

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setAuthUser(u);
      if (u) {
        const perfil = await Data.getUsuarioPorUid(u.uid);
        setUsuario(perfil);
        if (perfil) setRol(await Data.getRol(perfil.rolId));
      } else {
        setUsuario(null);
        setRol(null);
      }
    });
    return unsub;
  }, []);

  if (authUser === undefined) {
    return <div className="spinner-row" style={{ justifyContent: 'center', paddingTop: 100 }}>Cargando…</div>;
  }

  if (!authUser) {
    return <LoginScreen />;
  }

  if (authUser && usuario === null) {
    return (
      <div className="login-screen">
        <div className="login-panel">
          <div className="login-brand"><span className="dot"></span>Cuenta sin configurar</div>
          <div className="login-sub">
            Tu usuario existe en el sistema de autenticación pero todavía no tiene
            un perfil creado en la colección <code>usuarios</code> de Firestore
            (falta asignarle rol, nombre y sector). Pedile a un administrador que lo complete.
          </div>
          <button className="btn btn-ghost btn-block" onClick={() => auth.signOut()}>Cerrar sesión</button>
        </div>
      </div>
    );
  }

  const permisos = (rol && rol.permisos) || {};
  const puedeVerPanel = permisos.verPanelGlobal || permisos.verReportesDeEquipo || permisos.resolverAccionesCorrectivas;
  const puedeAdministrar = permisos.administrarRoles || permisos.administrarUsuarios ||
                            permisos.administrarPreguntas || permisos.administrarSectores;

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="sidebar-brand"><span className="dot"></span>Control Operativo</div>

        <button className={'nav-item' + (pantalla === 'checklist' ? ' active' : '')} onClick={() => setPantalla('checklist')}>
          Mi checklist
        </button>

        {puedeVerPanel && (
          <button className={'nav-item' + (pantalla === 'panel' ? ' active' : '')} onClick={() => setPantalla('panel')}>
            Panel
          </button>
        )}

        {puedeAdministrar && (
          <button className={'nav-item' + (pantalla === 'admin' ? ' active' : '')} onClick={() => setPantalla('admin')}>
            Administración
          </button>
        )}

        <div className="sidebar-footer">
          <div className="user-chip">
            <strong>{usuario.nombre}</strong>
            <span>{rol ? rol.nombre : '—'}</span>
          </div>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="main">
        {pantalla === 'checklist' && (
          <>
            <div className="page-header">
              <div className="eyebrow">Turno {Data.getMomentoActual()} · {Data.getFechaHoy()}</div>
              <h1 className="page-title">Mi checklist</h1>
              <p className="page-sub">Respondé cada punto de control de tu sector.</p>
            </div>
            <ChecklistScreen usuario={usuario} />
          </>
        )}

        {pantalla === 'panel' && puedeVerPanel && (
          <>
            <div className="page-header">
              <div className="eyebrow">Supervisión</div>
              <h1 className="page-title">Panel</h1>
              <p className="page-sub">Estado de los checklists de tu equipo y acciones pendientes.</p>
            </div>
            <DashboardScreen usuario={usuario} />
          </>
        )}

        {pantalla === 'admin' && puedeAdministrar && (
          <>
            <div className="page-header">
              <div className="eyebrow">Configuración</div>
              <h1 className="page-title">Administración</h1>
              <p className="page-sub">Roles, sectores, preguntas y usuarios del sistema.</p>
            </div>
            <AdminScreen usuario={usuario} />
          </>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
