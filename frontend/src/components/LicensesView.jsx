import React, { useState } from 'react';
import { Button, Input, Select, Table, Tag, Tooltip, message } from 'antd';
import { DownloadOutlined, PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, PaperClipOutlined, HistoryOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { STATUS_COLORS, STATUS_ROW_CLASS, SERVER_ORIGIN } from '../api';
import { exportLicensesToExcel } from '../excelExport';

const { Option } = Select;

const LicensesView = ({
  filteredLicenses,
  loadingLicenses,
  searchName,
  setSearchName,
  searchKey,
  setSearchKey,
  statusFilter,
  setStatusFilter,
  onAdd,
  onEdit,
  onDelete,
  onShowHistory,
  onBulkImport,
  canAdd,
  canEdit,
  canDelete,
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportLicensesToExcel(filteredLicenses);
    } catch (err) {
      message.error('Failed to export Excel file');
    } finally {
      setExporting(false);
    }
  };

  const baseColumns = [
    {
      title: 'S.No',
      key: 'sno',
      width: 70,
      render: (_, record) => filteredLicenses.findIndex((l) => l.id === record.id) + 1,
    },
    { title: 'Document Name', dataIndex: 'name', key: 'name' },
    { title: 'License/ID No.', dataIndex: 'license_key', key: 'license_key' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={STATUS_COLORS[status]}>{status}</Tag>,
    },
    {
      title: 'Validity Start',
      key: 'validity_start',
      render: (_, record) => record.validity_start ? dayjs(record.validity_start).format('D MMMM, YYYY') : 'N/A',
    },
    {
      title: 'Validity End',
      key: 'validity_end',
      render: (_, record) => record.validity_end ? dayjs(record.validity_end).format('D MMMM, YYYY') : 'N/A',
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (remarks) => remarks ? remarks : <span style={{ color: '#999' }}>—</span>
    },
    {
      title: 'Attachment',
      key: 'attachment',
      align: 'center',
      render: (_, record) => {
        if (record.attachment_path) {
          return (
            <Tooltip title={record.attachment_name || 'View file'}>
              <a href={`${SERVER_ORIGIN}/uploads/${record.attachment_path}`} target="_blank" rel="noreferrer">
                <PaperClipOutlined style={{ fontSize: 18 }} />
              </a>
            </Tooltip>
          );
        }
        return <span style={{ color: '#ccc' }}>—</span>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <span>
          <Button type="text" icon={<HistoryOutlined />} onClick={() => onShowHistory(record)} style={{ marginRight: 8 }} />
          {canEdit && <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} style={{ marginRight: 8, color: '#1890ff' }} />}
          {canDelete && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(record.id)} />}
        </span>
      ),
    },
  ];

  const columns = baseColumns;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Document & License List</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
            Export to Excel
          </Button>
          {canAdd && (
            <>
              <Button icon={<UploadOutlined />} onClick={onBulkImport}>
                Import from Excel
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
                Add Document
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <Input
          allowClear
          placeholder="Search by name..."
          prefix={<SearchOutlined />}
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          style={{ width: 220 }}
        />
        <Input
          allowClear
          placeholder="Search by license number..."
          prefix={<SearchOutlined />}
          value={searchKey}
          onChange={(e) => setSearchKey(e.target.value)}
          style={{ width: 220 }}
        />
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 180 }}>
          <Option value="all">All Statuses</Option>
          <Option value="Active">Active</Option>
          <Option value="Expiring Soon">Expiring Soon</Option>
          <Option value="Expired">Expired</Option>
        </Select>
      </div>

      <Table
        dataSource={filteredLicenses}
        columns={columns}
        rowKey="id"
        loading={loadingLicenses}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 1000 }}
        rowClassName={(record) => STATUS_ROW_CLASS[record.status] || ''}
      />
    </div>
  );
};

export default LicensesView;
