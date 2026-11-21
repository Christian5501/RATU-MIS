import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardShell from '../components/DashboardShell';
import { Section, Empty, Table, Badge, formatDate } from '../components/Table';

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(null);

  function reload() {
    axios.get('/api/finance/invoices').then((res) => setInvoices(res.data)).catch(() => setError('Could not load invoices'));
  }

  useEffect(() => {
    let ignore = false;
    axios.get('/api/finance/invoices')
      .then((res) => { if (!ignore) setInvoices(res.data); })
      .catch(() => { if (!ignore) setError('Could not load invoices'); });
    return () => { ignore = true; };
  }, []);

  async function markPaid(id) {
    setPaying(id);
    try {
      await axios.patch(`/api/finance/invoices/${id}/pay`);
      reload();
    } catch {
      setError('Could not update that invoice');
    } finally {
      setPaying(null);
    }
  }

  return (
    <DashboardShell role="finance">
      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}
      <Section title="All Invoices" eyebrow={`${invoices.filter((i) => i.status !== 'paid').length} outstanding`}>
        {invoices.length === 0 ? <Empty text="No invoices in the system yet" /> : (
          <Table headers={['Student', 'Description', 'Amount', 'Due', 'Status', '']} monoCols={[2, 3]}
            rows={invoices.map((inv) => [
              inv.student, inv.description || '—', `RWF ${Number(inv.amount).toLocaleString()}`, formatDate(inv.due_date),
              inv.status === 'paid' ? <Badge tone="positive">Paid</Badge> : <Badge tone="warning">{inv.status}</Badge>,
              inv.status !== 'paid' ? (
                <button onClick={() => markPaid(inv.id)} disabled={paying === inv.id}
                  className="text-[12px] font-medium text-role-finance hover:underline disabled:opacity-50">
                  {paying === inv.id ? 'Updating…' : 'Mark paid'}
                </button>
              ) : '',
            ])} />
        )}
      </Section>
    </DashboardShell>
  );
}
