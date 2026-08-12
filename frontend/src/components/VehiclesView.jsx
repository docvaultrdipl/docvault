import React, { useState } from 'react';
import { Button, Input, Select, Table, Tag, message, Tooltip } from 'antd';
import { DownloadOutlined, PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, AppstoreAddOutlined, HistoryOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { STATUS_COLORS, STATUS_ROW_CLASS, VEHICLE_CATEGORIES, SERVER_ORIGIN } from '../api';
import { exportVehiclesToExcel } from '../excelExport';

const { Option } = Select;

const CATEGORY_LABELS = VEHICLE_CATEGORIES.reduce((acc, c) => ({ ...acc, [c.value]: c.label }), {});

const VehiclesView = ({
  filteredVehicles,
  loadingVehicles,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  onAdd,
  onAddMulti,
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
      await exportVehiclesToExcel(filteredVehicles);
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
      render: (_, record) => filteredVehicles.findIndex((v) => v.id === record.id) + 1,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => <Tag>{CATEGORY_LABELS[category] || category}</Tag>,
    },
    { title: 'User Name', dataIndex: 'user_name', key: 'user_name' },
    { title: 'Place', dataIndex: 'place', key: 'place', render: (v) => v || <span style={{ color: '#999' }}>—</span> },
    { title: 'Vehicle Type', dataIndex: 'vehicle_type', key: 'vehicle_type', render: (v) => v || <span style={{ color: '#999' }}>—</span> },
    { title: 'Vehicle Number', dataIndex: 'vehicle_number', key: 'vehicle_number' },
    {
      title: 'Validity',
      key: 'validity',
      render: (_, record) => record.validity ? dayjs(record.validity).format('D MMMM, YYYY') : 'N/A',
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={STATUS_COLORS[status]}>{status}</Tag>,
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
        <h2>Vehicle Insurance List</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
            Export to Excel
          </Button>
          {canAdd && (
            <>
              <Button icon={<UploadOutlined />} onClick={onBulkImport}>
                Import from Excel
              </Button>
              <Button icon={<AppstoreAddOutlined />} onClick={onAddMulti}>
                Add to Multiple Categories
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
                Add Vehicle
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <Input
          allowClear
          placeholder="Search name, place, vehicle number..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 260 }}
        />
        <Select value={categoryFilter} onChange={setCategoryFilter} style={{ width: 180 }}>
          <Option value="all">All Categories</Option>
          {VEHICLE_CATEGORIES.map((c) => <Option key={c.value} value={c.value}>{c.label}</Option>)}
        </Select>
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 180 }}>
          <Option value="all">All Statuses</Option>
          <Option value="Active">Active</Option>
          <Option value="Expiring Soon">Expiring Soon</Option>
          <Option value="Expired">Expired</Option>
        </Select>
      </div>

      <Table
        dataSource={filteredVehicles}
        columns={columns}
        rowKey="id"
        loading={loadingVehicles}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 1250 }}
        rowClassName={(record) => STATUS_ROW_CLASS[record.status] || ''}
      />
    </div>
  );
};

export default VehiclesView;
