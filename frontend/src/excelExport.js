import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

// ARGB hex fills/fonts used in the Excel export, matching the row colors used in the tables.
const STATUS_EXCEL_FILL = {
  'Active': 'FFE6F4EA',
  'Expiring Soon': 'FFFFF7DB',
  'Expired': 'FFFDE7E7',
};
const STATUS_EXCEL_FONT = {
  'Active': 'FF1E7A34',
  'Expiring Soon': 'FFAD7A00',
  'Expired': 'FFC0392B',
};

// Generic exporter: builds a real, formatted .xlsx file (colored header + status-colored
// rows) from the given already-mapped rows and triggers a download.
// columns: [{ header, key, width }]  — values are read from each row via `key`.
// statusKey: which field on each row holds the Active/Expiring Soon/Expired value.
async function exportRowsToExcel(rows, { sheetName, filenamePrefix, columns, statusKey = 'status' }) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns;

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  rows.forEach((row) => {
    const excelRow = sheet.addRow(row);

    const status = row[statusKey];
    const fillColor = STATUS_EXCEL_FILL[status];
    if (fillColor) {
      excelRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      });
    }
    const statusCell = excelRow.getCell(statusKey);
    if (statusCell) {
      statusCell.font = { bold: true, color: { argb: STATUS_EXCEL_FONT[status] || 'FF000000' } };
    }
    excelRow.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' };
    });
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}-${dayjs().format('YYYY-MM-DD')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportLicensesToExcel(rows) {
  const mapped = rows.map((row, index) => ({
    sno: index + 1,
    name: row.name,
    license_key: row.license_key,
    type: row.type || '',
    status: row.status,
    validity_start: row.validity_start ? dayjs(row.validity_start).format('D MMMM, YYYY') : '',
    validity_end: row.validity_end ? dayjs(row.validity_end).format('D MMMM, YYYY') : '',
    remarks: row.remarks || '',
  }));

  await exportRowsToExcel(mapped, {
    sheetName: 'Licenses',
    filenamePrefix: 'licenses',
    columns: [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Document Name', key: 'name', width: 28 },
      { header: 'License/ID No.', key: 'license_key', width: 22 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Validity Start', key: 'validity_start', width: 18 },
      { header: 'Validity End', key: 'validity_end', width: 18 },
      { header: 'Remarks', key: 'remarks', width: 28 },
    ],
  });
}

export async function exportVehiclesToExcel(rows) {
  const mapped = rows.map((row, index) => ({
    sno: index + 1,
    category: row.category ? row.category.toUpperCase() : '',
    user_name: row.user_name,
    place: row.place || '',
    vehicle_type: row.vehicle_type || '',
    vehicle_number: row.vehicle_number,
    status: row.status,
    validity: row.validity ? dayjs(row.validity).format('D MMMM, YYYY') : '',
  }));

  await exportRowsToExcel(mapped, {
    sheetName: 'Vehicles',
    filenamePrefix: 'vehicles',
    columns: [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Category', key: 'category', width: 14 },
      { header: 'User Name', key: 'user_name', width: 22 },
      { header: 'Place', key: 'place', width: 18 },
      { header: 'Vehicle Type', key: 'vehicle_type', width: 16 },
      { header: 'Vehicle Number', key: 'vehicle_number', width: 20 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Validity', key: 'validity', width: 18 },
    ],
  });
}
