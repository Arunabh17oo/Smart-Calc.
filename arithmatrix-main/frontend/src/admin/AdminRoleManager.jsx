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

export function AdminRoleManager({ currentAccount, accounts, onRoleChange }) {
  const currentRole = safeRole(currentAccount?.role);

  if (!currentAccount) {
    return <p className="error-text">Login is required to access admin controls.</p>;
  }

  if (currentRole !== 'admin') {
    return <p className="error-text">Only admin users can manage account roles.</p>;
  }

  const sortedAccounts = [...(accounts || [])].sort((a, b) => {
    const aRole = safeRole(a?.role);
    const bRole = safeRole(b?.role);
    if (aRole === 'admin' && bRole !== 'admin') return -1;
    if (bRole === 'admin' && aRole !== 'admin') return 1;
    return String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''));
  });

  return (
    <div className="admin-role-block">
      <p className="hint-text">
        Admin can assign `student` or `teacher` roles. Teacher role unlocks teacher tools in
        Subjective Tests.
      </p>

      <div className="admin-role-table-wrap">
        <table className="admin-role-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email / Mobile</th>
              <th>Current Role</th>
              <th>Set Role</th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((account) => {
              const role = safeRole(account.role);
              const isSystemAdmin = account.id === 'sys-admin-1' || role === 'admin';
              const identity = account.email || account.mobile || account.id;

              return (
                <tr key={account.id}>
                  <td>{account.fullName || 'User'}</td>
                  <td>{identity}</td>
                  <td>
                    <span className={`admin-role-pill admin-role-pill-${role}`}>{roleBadgeLabel(role)}</span>
                  </td>
                  <td>
                    {isSystemAdmin ? (
                      <span className="hint-text">Locked</span>
                    ) : (
                      <select
                        className="subjective-level-select"
                        value={role}
                        onChange={(event) => onRoleChange(account.id, event.target.value)}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                      </select>
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
