import { PANEL } from '../ui/styles';

export default function EmptyState({ title }) {
  return (
    <section className={`${PANEL} px-8 py-16 text-center text-muted`}>
      <div className="mx-auto mb-[18px] size-[72px] rounded-full border-8 border-line border-t-accent" aria-hidden="true" />
      <h2 className="m-0 mb-1.5 text-lg font-bold text-ink">{title}</h2>
      <p className="mx-auto my-0 max-w-[48ch]">Paste a page URL, choose its type and select Run test. Scores, the slowest API calls and the heaviest images and scripts will show up here.</p>
    </section>
  );
}
