import React, { useState, useMemo } from 'react';
import { Calendar, Badge, Card, List, Button, Empty } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const STATUS_BADGE = {
  'Active': 'success',
  'Expiring Soon': 'warning',
  'Expired': 'error',
};

// Opens a new tab with a print-friendly report and triggers the browser's
// print dialog. The person can "Save as PDF" from there — no extra PDF
// library needed, and it works consistently across browsers.
function printMonthlyReport(items, monthLabel) {
  const rows = items
    .slice()
    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
    .map((item) => `
      <tr>
        <td>${item.type}</td>
        <td>${item.name}</td>
        <td>${dayjs(item.date).format('D MMMM, YYYY')}</td>
        <td>${item.status}</td>
      </tr>
    `).join('');

  const html = `
    <html>
      <head>
        <title>Expiring Items Report — ${monthLabel}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #222; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p.meta { color: #666; font-size: 13px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; font-size: 13px; }
          th { background: #1F3864; color: #fff; }
          tr:nth-child(even) { background: #f7f7f7; }
        </style>
      </head>
      <body>
        <h1>Expiring Items Report — ${monthLabel}</h1>
        <p class="meta">Generated on ${dayjs().format('D MMMM, YYYY')} • ${items.length} item(s)</p>
        <table>
          <thead><tr><th>Type</th><th>Name</th><th>Expiry Date</th><th>Status</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4">Nothing expiring this month</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

const CalendarView = ({ calendarItems }) => {
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const itemsByDate = useMemo(() => {
    const map = {};
    calendarItems.forEach((item) => {
      const key = dayjs(item.date).format('YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [calendarItems]);

  const renderDateCell = (value) => {
    const key = value.format('YYYY-MM-DD');
    const items = itemsByDate[key] || [];
    if (items.length === 0) return null;
    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.slice(0, 3).map((item, i) => (
          <li key={i} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Badge status={STATUS_BADGE[item.status] || 'default'} text={<span style={{ fontSize: 11 }}>{item.name}</span>} />
          </li>
        ))}
        {items.length > 3 && <li style={{ fontSize: 11, color: '#999' }}>+{items.length - 3} more</li>}
      </ul>
    );
  };

  const selectedKey = selectedDate.format('YYYY-MM-DD');
  const selectedItems = itemsByDate[selectedKey] || [];

  const handlePrintMonth = () => {
    const monthStart = selectedDate.startOf('month');
    const monthEnd = selectedDate.endOf('month');
    const monthItems = calendarItems.filter((item) => {
      const d = dayjs(item.date);
      return d.isSameOrAfter(monthStart) && d.isSameOrBefore(monthEnd);
    });
    printMonthlyReport(monthItems, selectedDate.format('MMMM YYYY'));
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0,fontSize: 30, textTransform: 'Capitalize', backgroundColor: '#1677FF',padding: 16, borderRadius: 10, color: '#fff',width: '100%'}}>Renewal Calendar</h2>
        <Button icon={<PrinterOutlined />} onClick={handlePrintMonth}>
          Print {selectedDate.format('MMMM')}'s Report
        </Button>
      </div>

      <Card bordered={false}>
        <Calendar
          value={selectedDate}
          onSelect={setSelectedDate}
          cellRender={(current, info) => (info.type === 'date' ? renderDateCell(current) : info.originNode)}
        />
      </Card>

      <Card title={`Expiring on ${selectedDate.format('D MMMM, YYYY')}`} bordered={false} style={{ marginTop: 16 }}>
        {selectedItems.length === 0 ? (
          <Empty description="Nothing expiring on this date" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={selectedItems}
            renderItem={(item) => (
              <List.Item>
                <Badge status={STATUS_BADGE[item.status] || 'default'} text={`${item.type}: ${item.name} — ${item.status}`} />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default CalendarView;
