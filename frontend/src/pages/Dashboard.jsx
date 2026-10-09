import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="auth-title" style={{ margin: 0, textAlign: 'left' }}>Dashboard</h1>
        <button onClick={logout} className="btn btn-secondary" style={{ width: 'auto' }}>
          Sign Out
        </button>
      </div>

      <div className="user-card">
        <div className="user-info-row">
          <span className="info-label">Full Name</span>
          <span className="info-value">{user.name}</span>
        </div>
        
        <div className="user-info-row">
          <span className="info-label">Email Address</span>
          <span className="info-value">{user.email}</span>
        </div>
        
        <div className="user-info-row">
          <span className="info-label">Account Status</span>
          <div>
            <span className="status-badge">
              {user.is_verified === 1 ? 'Verified User' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
