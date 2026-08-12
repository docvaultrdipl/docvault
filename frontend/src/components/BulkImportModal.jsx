import React, { useState } from 'react';
import { Modal, Button, Upload, Table, message, Alert } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import ExcelJS from 'exceljs';

// Column definitions per module. Order matters: the parser reads cells by
// position (column 1, 2, 3...), matching the order used in the downloadable
// template — so as long as the person fills in the template as-is, it works.
const COLUMN_CONFIG = {
  licenses: [
    { header: 'Document Name', key: 'name' },
    { header: 'License/ID No.', key: 'license_key' },
    { header: 'Type', key: 'type' },
    { header: 'Validity Start (YYYY-MM-DD)', key: 'validity_start' },
    { header: 'Validity End (YYYY-MM-DD)', key: 'validity_end' },
    { header: 'Remarks', key: 'remarks' },
  ],
  vehicles: [
    { header: 'Category (rc/tax/od/tp/pollution)', key: 'category' },
    { header: 'User Name', key: 'user_name' },
    { header: 'Place', key: 'place' },
    { header: 'Vehicle Type', key: 'vehicle_type' },
    { header: 'Vehicle Number', key: 'vehicle_number' },
    { header: 'Validity (YYYY-MM-DD)', key: 'validity' },
  ],
};

async function downloadTemplate(moduleType) {
  const columns = COLUMN_CONFIG[moduleType];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template');
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 26 }));
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${moduleType}-import-template.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const BulkImportModal = ({ visible, onCancel, moduleType, onImport, importing }) => {
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);

  const columns = COLUMN_CONFIG[moduleType] || [];

  const handleClose = () => {
    setParsedRows([]);
    setFileName('');
    onCancel();
  };

  const handleFileSelected = async (file) => {
    setParsing(true);
    setParsedRows([]);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];

      const rows = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header row
        const rowObj = {};
        columns.forEach((col, idx) => {
          const cell = row.getCell(idx + 1);
          rowObj[col.key] = (cell.text || '').trim();
        });
        if (Object.values(rowObj).some((v) => v)) {
          rows.push(rowObj);
        }
      });

      if (rows.length === 0) {
        message.warning('No data rows found in that file.');
      }
      setParsedRows(rows);
      setFileName(file.name);
    } catch (err) {
      message.error('Could not read that Excel file. Make sure it matches the template format.');
    } finally {
      setParsing(false);
    }
    return false; // prevent antd's default auto-upload behavior
  };

  const previewColumns = columns.map((c) => ({ title: c.header, dataIndex: c.key, key: c.key, ellipsis: true }));

  return (
    <Modal
      title="Bulk Import from Excel"
      open={visible}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      width={720}
      style={{ maxWidth: '92vw' }}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Download the template, fill it in without changing the column order, then upload it here."
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate(moduleType)}>
          Download Template
        </Button>
        <Upload beforeUpload={handleFileSelected} maxCount={1} accept=".xlsx">
          <Button icon={<UploadOutlined />} loading={parsing}>Select Excel File</Button>
        </Upload>
      </div>

      {parsedRows.length > 0 && (
        <>
          <p>
            <strong>{parsedRows.length}</strong> record(s) found in "{fileName}". Preview (first 5 shown):
          </p>
          <Table
            dataSource={parsedRows.slice(0, 5)}
            columns={previewColumns}
            pagination={false}
            size="small"
            rowKey={(_, i) => i}
            scroll={{ x: true }}
            style={{ marginBottom: 16 }}
          />
          <div style={{ textAlign: 'right' }}>
            <Button onClick={handleClose} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" loading={importing} onClick={() => onImport(parsedRows)}>
              Import {parsedRows.length} Record(s)
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default BulkImportModal;
