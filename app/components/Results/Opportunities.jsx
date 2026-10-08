import { OPPORTUNITIES } from '@/lib/config';
import { formatBytes, formatMs } from '@/lib/format';
import Accordion from '../ui/Accordion';
import Badge from '../ui/Badge';
import { CODE, NONE, NOTE, NUMERIC, ROW_HINT, SECTION_TITLE, TABLE, TD, URL_CELL } from '../ui/styles';
import { CopyableText } from './CopyableUrl';

const isHttp = (url) => /^https?:/.test(url);

/** Recurso afectado: URL copiable, o el nombre del módulo (p. ej. JS duplicado) cuando no es una URL. */
function ResourceCell({ item }) {
  if (isHttp(item.url)) return <CopyableText url={item.url} hint={item.detail} />;
  return (
    <>
      <code className={CODE}>{item.url}</code>
      {item.detail && <div className={ROW_HINT}>{item.detail}</div>}
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
          <div className="overflow-x-auto pb-1.5">
            <table className={TABLE}>
              <tbody>
                {opportunity.items.map((item, index) => (
                  <tr key={index} className="group/row">
                    <td className={`${TD} ${URL_CELL}`}><ResourceCell item={item} /></td>
                    <td className={`${TD} ${NUMERIC}`}>{formatItemSavings(item)}</td>
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
      <h3 className={SECTION_TITLE}>Top opportunities</h3>
      <p className={NOTE}>Ordered by estimated time saved. Estimates come from Lighthouse; open one to see the files involved.</p>
      {items.length === 0
        ? <div className={NONE}>Lighthouse found no significant opportunities.</div>
        : <div className="mt-1 grid gap-2">{items.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div>}
    </>
  );
}
