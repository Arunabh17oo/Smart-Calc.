import { AdminRoleManager } from '../admin/AdminRoleManager.jsx';

export function AdminPage({ currentAccount, accounts, onRoleChange }) {
  return (
    <section className="panel">
      <div className="panel-row panel-row-space">
        <h2>Admin Control Room</h2>
      </div>
      <AdminRoleManager
        currentAccount={currentAccount}
        accounts={accounts}
        onRoleChange={onRoleChange}
      />
    </section>
  );
}
