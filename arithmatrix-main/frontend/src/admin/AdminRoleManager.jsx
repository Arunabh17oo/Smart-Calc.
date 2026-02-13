function safeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (role === 'teacher' || role === 'admin') return role;
  return 'student';
}

function roleBadgeLabel(role) {
  const safe = safeRole(role);
  if (safe === 'admin') return 'Admin';
  if (safe === 'teacher') return 'Teacher';
  return 'Student';
}

function toTimestamp(value) {
  const time = new Date(String(value || '')).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatJoinedAt(value) {
  const time = toTimestamp(value);
  if (!time) return 'Unknown';
  return new Date(time).toLocaleString();
}

export function AdminRoleManager({ currentAccount, accounts, onRoleChange, onDeleteAccount }) {
  const currentRole = safeRole(currentAccount?.role);

  if (!currentAccount) {
    return <p className="error-text">Login is required to access admin controls.</p>;
  }

  if (currentRole !== 'admin') {
    return <p className="error-text">Only admin users can manage account roles.</p>;
  }

  const sortedAccounts = [...(accounts || [])].sort((a, b) => {
    const aIsSystemAdmin = a?.id === 'sys-admin-1';
    const bIsSystemAdmin = b?.id === 'sys-admin-1';
    if (aIsSystemAdmin && !bIsSystemAdmin) return 1;
    if (bIsSystemAdmin && !aIsSystemAdmin) return -1;

    const aCreated = toTimestamp(a?.createdAt);
    const bCreated = toTimestamp(b?.createdAt);
    return bCreated - aCreated;
  });

  const latestSignup = sortedAccounts.find((account) => account?.id !== 'sys-admin-1');

  return (
    <div className="admin-role-block">
      <p className="hint-text">
        Latest signups are shown first. Assign `student` or `teacher` roles based on recent
        registrations.
      </p>
      {latestSignup ? (
        <p className="hint-text">
          Latest signup: {latestSignup.fullName || 'User'} ({latestSignup.email || latestSignup.mobile || latestSignup.id}) at{' '}
          {formatJoinedAt(latestSignup.createdAt)}
        </p>
      ) : null}

      <div className="admin-role-table-wrap">
        <table className="admin-role-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email / Mobile</th>
              <th>Joined</th>
              <th>Current Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((account) => {
              const role = safeRole(account.role);
              const isSystemAdmin = account.id === 'sys-admin-1' || role === 'admin';
              const identity = account.email || account.mobile || account.id;
              const canDelete = !isSystemAdmin;

              return (
                <tr key={account.id}>
                  <td>{account.fullName || 'User'}</td>
                  <td>{identity}</td>
                  <td>{formatJoinedAt(account.createdAt)}</td>
                  <td>
                    <span className={`admin-role-pill admin-role-pill-${role}`}>{roleBadgeLabel(role)}</span>
                  </td>
                  <td>
                    {isSystemAdmin ? (
                      <span className="hint-text">Locked</span>
                    ) : (
                      <div className="admin-role-actions">
                        <select
                          className="subjective-level-select"
                          value={role}
                          onChange={(event) => onRoleChange(account.id, event.target.value)}
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                        </select>
                        <button
                          type="button"
                          className="danger-btn admin-delete-btn"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Delete user "${account.fullName || 'User'}" (${identity})?`
                            );
                            if (confirmed) onDeleteAccount?.(account.id);
                          }}
                          disabled={!canDelete}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
