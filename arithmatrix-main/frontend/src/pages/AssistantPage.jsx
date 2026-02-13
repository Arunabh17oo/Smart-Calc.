import { AssistantWidget } from '../components/AssistantWidget.jsx';

export function AssistantPage({ storageKey }) {
  return (
    <section className="panel">
      <AssistantWidget storageKey={storageKey} />
    </section>
  );
}
