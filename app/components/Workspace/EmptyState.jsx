export default function EmptyState({ title }) {
  return (
    <section className="panel empty">
      <div className="empty-ring" aria-hidden="true" />
      <h2>{title}</h2>
      <p>Paste a page URL, choose its type and select Run test. Scores, the slowest API calls and the heaviest images and scripts will show up here.</p>
    </section>
  );
}
