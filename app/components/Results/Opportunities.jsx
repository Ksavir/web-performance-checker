import { OPPORTUNITIES } from '@/lib/config';
import { formatBytes, formatMs } from '@/lib/format';
import Accordion from '../ui/Accordion';
import Badge from '../ui/Badge';
import { CopyableText } from './CopyableUrl';

const isHttp = (url) => /^https?:/.test(url);

/** Recurso afectado: URL copiable, o el nombre del módulo (p. ej. JS duplicado) cuando no es una URL. */
function ResourceCell({ item }) {
  if (isHttp(item.url)) return <CopyableText url={item.url} hint={item.detail} />;
  return (
    <>
      <code>{item.url}</code>
      {item.detail && <div className="row-hint">{item.detail}</div>}
    </>
  );
}

function formatItemSavings(item) {
  if (item.wasted) return formatBytes(item.wasted);
  if (item.wastedMs) return formatMs(item.wastedMs);
  return '–';
}

function SavingsBadges({ opportunity }) {
  return (
    <>
      {opportunity.savingsMs ? <Badge>−{formatMs(opportunity.savingsMs)} {opportunity.metric}</Badge> : null}
      {opportunity.savingsBytes ? <Badge tone="muted">{formatBytes(opportunity.savingsBytes)}</Badge> : null}
    </>
  );
}

function OpportunityCard({ opportunity }) {
  return (
    <Accordion variant="card">
      <Accordion.Summary title={opportunity.title} badge={<SavingsBadges opportunity={opportunity} />} />
      <Accordion.Body note={OPPORTUNITIES[opportunity.id]?.tip}>
        {opportunity.items.length > 0 && (
          <div className="table-wrap">
            <table className="ledger">
              <tbody>
                {opportunity.items.map((item, index) => (
                  <tr key={index}>
                    <td className="url-cell"><ResourceCell item={item} /></td>
                    <td className="num">{formatItemSavings(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Accordion.Body>
    </Accordion>
  );
}

export default function Opportunities({ items }) {
  return (
    <>
      <h3>Top opportunities</h3>
      <p className="note">Ordered by estimated time saved. Estimates come from Lighthouse; open one to see the files involved.</p>
      {items.length === 0
        ? <div className="none">Lighthouse found no significant opportunities.</div>
        : <div className="opps">{items.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div>}
    </>
  );
}
