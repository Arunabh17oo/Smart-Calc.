import { SubjectiveTestPanel } from '../components/SubjectiveTestPanel.jsx';

export function SubjectivePage({
  storageKey,
  userRole,
  defaultStudentName,
  defaultStudentEmail,
  defaultTeacherName,
  defaultTeacherEmail
}) {
  return (
    <section className="panel">
      <SubjectiveTestPanel
        storageKey={storageKey}
        userRole={userRole}
        defaultStudentName={defaultStudentName}
        defaultStudentEmail={defaultStudentEmail}
        defaultTeacherName={defaultTeacherName}
        defaultTeacherEmail={defaultTeacherEmail}
      />
    </section>
  );
}
