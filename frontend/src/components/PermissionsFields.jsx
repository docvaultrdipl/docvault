import React from 'react';
import { Form, Checkbox, Row, Col } from 'antd';

const MODULES = [
  { key: 'licenses', label: 'Licenses (Documents)' },
  { key: 'vehicles', label: 'Vehicles (Insurance)' },
];

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

// Renders inside any antd <Form>. Field paths are ['permissions', moduleKey, actionKey]
// and ['permissions', 'manage_users'] — matching the shape the backend expects.
const PermissionsFields = () => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontWeight: 500, marginBottom: 8 }}>Access Rights</div>
    {MODULES.map((mod) => (
      <Row key={mod.key} align="middle" style={{ marginBottom: 8 }} gutter={8}>
        <Col span={8} style={{ fontSize: 13, color: 'rgba(0,0,0,0.75)' }}>{mod.label}</Col>
        {ACTIONS.map((action) => (
          <Col key={action.key}>
            <Form.Item name={['permissions', mod.key, action.key]} valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>{action.label}</Checkbox>
            </Form.Item>
          </Col>
        ))}
      </Row>
    ))}
    <Form.Item name={['permissions', 'manage_users']} valuePropName="checked" style={{ marginTop: 8, marginBottom: 0 }}>
      <Checkbox>Can manage other users (create accounts, change rights, remove access)</Checkbox>
    </Form.Item>
  </div>
);

export default PermissionsFields;
