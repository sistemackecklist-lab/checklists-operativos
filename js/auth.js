/* ============================================================
   PANTALLA DE LOGIN
   Email + contraseña reales (Firebase Auth), con sesión
   persistente en el dispositivo — el usuario no vuelve a
   loguearse salvo que cierre sesión manualmente.
   ============================================================ */

function LoginScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.signInWithEmailAndPassword(email.trim(), password);
      // El listener de auth en app.js se encarga de redirigir.
    } catch (err) {
      setLoading(false);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Usuario o contraseña incorrectos.');
      } else {
        setError('No se pudo iniciar sesión. Intentá de nuevo.');
      }
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-brand"><span className="dot"></span>Control Operativo</div>
        <div className="login-sub">Ingresá con tu usuario para completar el checklist del turno.</div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
