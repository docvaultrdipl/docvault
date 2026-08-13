import React, { useMemo, useState } from 'react';
import { AutoComplete, Input, Tag } from 'antd';
import { SearchOutlined, FileTextOutlined, CarOutlined } from '@ant-design/icons';
import { STATUS_COLORS } from '../api';

const MAX_RESULTS = 8;

const GlobalSearch = ({ licenses, vehicles, onSelectLicense, onSelectVehicle }) => {
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const licenseMatches = licenses
      .filter((l) => (l.name || '').toLowerCase().includes(q) || (l.license_key || '').toLowerCase().includes(q))
      .slice(0, MAX_RESULTS)
      .map((l) => ({
        value: `license-${l.id}`,
        record: l,
        type: 'license',
        label: (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />{l.name} <span style={{ color: '#999' }}>({l.license_key})</span></span>
            <Tag color={STATUS_COLORS[l.status]}>{l.status}</Tag>
          </span>
        ),
      }));

    const vehicleMatches = vehicles
      .filter((v) => [v.user_name, v.place, v.vehicle_type, v.vehicle_number].some((f) => (f || '').toLowerCase().includes(q)))
      .slice(0, MAX_RESULTS)
      .map((v) => ({
        value: `vehicle-${v.id}`,
        record: v,
        type: 'vehicle',
        label: (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><CarOutlined style={{ marginRight: 8, color: '#52c41a' }} />{v.user_name} <span style={{ color: '#999' }}>({v.vehicle_number})</span></span>
            <Tag color={STATUS_COLORS[v.status]}>{v.status}</Tag>
          </span>
        ),
      }));

    return [...licenseMatches, ...vehicleMatches].slice(0, MAX_RESULTS);
  }, [query, licenses, vehicles]);

  const handleSelect = (value, option) => {
    setQuery('');
    if (option.type === 'license') {
      onSelectLicense(option.record);
    } else {
      onSelectVehicle(option.record);
    }
  };

  return (
    <AutoComplete
      options={options}
      value={query}
      onChange={setQuery}
      onSelect={handleSelect}
      style={{ width: 280 }}
      popupMatchSelectWidth={360}
      style={{ height: 35, width: '20%' }}
    >
      <Input style={{ height: 35 }} allowClear prefix={<SearchOutlined />} placeholder="Search licenses & vehicles..." />
    </AutoComplete>
  );
};

export default GlobalSearch;
