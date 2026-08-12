import React, { useState, useMemo } from 'react';
import { Card, Col, Row, Button, List, Empty } from 'antd';
import { PlusOutlined, HistoryOutlined, CarOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import dayjs from 'dayjs';
import { VEHICLE_CATEGORIES } from '../api';

const ACTIVE_COLOR = '#52c41a';
const SOON_COLOR = '#faad14';
const EXPIRED_COLOR = '#f5222d';

const ACTION_LABELS = {
  created: 'added',
  updated: 'edited',
  deleted: 'deleted',
};

const ENTITY_ICONS = {
  license: null,
  vehicle: <CarOutlined style={{ marginRight: 4 }} />,
};

const StatCard = ({ label, value, color, onClick }) => (
  <Col xs={12} md={6}>
    <Card bordered={false} hoverable onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 'bold', color: color || undefined }}>{value}</div>
    </Card>
  </Col>
);

const VEHICLE_CATEGORY_FILTERS = [{ value: 'all', label: 'All' }, ...VEHICLE_CATEGORIES];

const DashboardView = ({
  licenseCounts,
  vehicleStats,
  vehicles,
  activityLog,
  onLicenseCardClick,
  onVehicleCardClick,
  onAddDocument,
  onAddVehicle,
  canAddDocument,
  canAddVehicle,
}) => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'license' | 'vehicle'
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState('all');

  const statusChartData = (counts) => ([
    { name: 'Active', value: counts.active, fill: ACTIVE_COLOR },
    { name: 'Expiring Soon', value: counts.expiringSoon, fill: SOON_COLOR },
    { name: 'Expired', value: counts.expired, fill: EXPIRED_COLOR },
  ]);

  const licenseChartData = statusChartData(licenseCounts);

  // Vehicle chart counts recomputed on the fly for whichever category is
  // selected (or combined across all categories when "All" is selected).
  const vehicleChartData = useMemo(() => {
    const filtered = vehicleCategoryFilter === 'all'
      ? vehicles
      : vehicles.filter((v) => v.category === vehicleCategoryFilter);

    const counts = {
      active: filtered.filter((v) => v.status === 'Active').length,
      expiringSoon: filtered.filter((v) => v.status === 'Expiring Soon').length,
      expired: filtered.filter((v) => v.status === 'Expired').length,
    };
    return statusChartData(counts);
  }, [vehicles, vehicleCategoryFilter]);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'license', label: 'License' },
    { key: 'vehicle', label: 'Vehicle' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Dashboard Overview</h2>

      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', marginBottom: 8 }}>Licenses</div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <StatCard label="Total" value={licenseCounts.total} onClick={() => onLicenseCardClick('all')} />
        <StatCard label="Active" value={licenseCounts.active} color={ACTIVE_COLOR} onClick={() => onLicenseCardClick('Active')} />
        <StatCard label="Expiring Soon" value={licenseCounts.expiringSoon} color={SOON_COLOR} onClick={() => onLicenseCardClick('Expiring Soon')} />
        <StatCard label="Expired" value={licenseCounts.expired} color={EXPIRED_COLOR} onClick={() => onLicenseCardClick('Expired')} />
      </Row>

      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', marginBottom: 8 }}>Vehicles</div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <StatCard label="Total" value={vehicleStats.total} onClick={() => onVehicleCardClick('all')} />
        <StatCard label="Active" value={vehicleStats.active} color={ACTIVE_COLOR} onClick={() => onVehicleCardClick('Active')} />
        <StatCard label="Expiring Soon" value={vehicleStats.expiringSoon} color={SOON_COLOR} onClick={() => onVehicleCardClick('Expiring Soon')} />
        <StatCard label="Expired" value={vehicleStats.expired} color={EXPIRED_COLOR} onClick={() => onVehicleCardClick('Expired')} />
      </Row>

      <Card bordered={false} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              type={activeTab === tab.key ? 'primary' : 'default'}
              size="small"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <Row gutter={20}>
          {(activeTab === 'all' || activeTab === 'license') && (
            <Col xs={24} md={activeTab === 'all' ? 12 : 24}>
              <h4 style={{ marginBottom: 8 }}>Licenses</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={licenseChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {licenseChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Col>
          )}
          {(activeTab === 'all' || activeTab === 'vehicle') && (
            <Col xs={24} md={activeTab === 'all' ? 12 : 24}>
              <h4 style={{ marginBottom: 8 }}>Vehicles</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {VEHICLE_CATEGORY_FILTERS.map((cat) => (
                  <Button
                    key={cat.value}
                    size="small"
                    type={vehicleCategoryFilter === cat.value ? 'primary' : 'default'}
                    onClick={() => setVehicleCategoryFilter(cat.value)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={vehicleChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {vehicleChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Col>
          )}
        </Row>
      </Card>

      {(canAddDocument || canAddVehicle) && (
        <Card title="Quick Actions" bordered={false} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {canAddDocument && <Button type="primary" size="large" icon={<PlusOutlined />} onClick={onAddDocument}>Add New Document</Button>}
            {canAddVehicle && <Button size="large" icon={<PlusOutlined />} onClick={onAddVehicle}>Add Vehicle Record</Button>}
          </div>
        </Card>
      )}

      <Card title={<span><HistoryOutlined style={{ marginRight: 8 }} />Recent Activity</span>} bordered={false}>
        {activityLog.length === 0 ? (
          <Empty description="No activity yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={activityLog}
            renderItem={(entry) => (
              <List.Item>
                <span>
                  {ENTITY_ICONS[entry.entity_type]}
                  <strong>{entry.actor_name}</strong> {ACTION_LABELS[entry.action] || entry.action}{' '}
                  "<strong>{entry.license_name}</strong>" — {dayjs(entry.created_at).fromNow()}
                </span>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default DashboardView;
