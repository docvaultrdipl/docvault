import React from 'react';
import { Modal, Form, Input, Button, DatePicker, Select, Checkbox, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { VEHICLE_CATEGORIES } from '../api';

const VehicleModal = ({
  mode, // 'single' | 'multi'
  form,
  editingVehicle,
  isVisible,
  onCancel,
  onSubmit,
  submitting,
}) => {
  const selectedCategories = Form.useWatch('categories', form) || [];

  const title = mode === 'multi'
    ? 'Add Vehicle to Multiple Categories'
    : (editingVehicle ? 'Edit Vehicle Record' : 'Add Vehicle Record');

  return (
    <Modal
      title={title}
      open={isVisible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={520}
      style={{ maxWidth: '92vw' }}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="user_name" label="User Name" rules={[{ required: true, message: 'Please enter the user name' }]}>
          <Input placeholder="e.g. Ramesh Kumar" />
        </Form.Item>
        <Form.Item name="place" label="Location">
          <Input placeholder="e.g. Jamshedpur" />
        </Form.Item>
        <Form.Item name="vehicle_type" label="Vehicle Type">
          <Input placeholder="e.g. Truck, Van, Car" />
        </Form.Item>
        <Form.Item name="vehicle_number" label="Vehicle Number" rules={[{ required: true, message: 'Please enter the vehicle number' }]}>
          <Input placeholder="e.g. JH05AB1234" style={{ textTransform: 'uppercase' }} />
        </Form.Item>

        {mode === 'single' ? (
          <>
            <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select a category' }]}>
              <Select placeholder="Select category" disabled={!!editingVehicle}>
                {VEHICLE_CATEGORIES.map((c) => <Select.Option key={c.value} value={c.value}>{c.label}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="validity" label="Validity Date" rules={[{ required: true, message: 'Please select the validity date' }]} extra="Status updates automatically: Active, Expiring Soon (within 10 days), or Expired.">
              <DatePicker style={{ width: '100%' }} format="D MMMM, YYYY" />
            </Form.Item>
            <Form.Item
              name="attachment"
              label="Attachment (RC copy, insurance paper, etc.)"
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            >
              <Upload beforeUpload={() => false} maxCount={1}>
                <Button icon={<UploadOutlined />}>Click to Attach File</Button>
              </Upload>
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item name="categories" label="Categories" rules={[{ required: true, message: 'Select at least one category' }]}>
              <Checkbox.Group options={VEHICLE_CATEGORIES.map((c) => ({ label: c.label, value: c.value }))} />
            </Form.Item>
            {selectedCategories.map((cat) => {
              const label = VEHICLE_CATEGORIES.find((c) => c.value === cat)?.label || cat;
              return (
                <Form.Item
                  key={cat}
                  name={['validity_by_category', cat]}
                  label={`${label} — Validity Date`}
                  rules={[{ required: true, message: `Please select the validity date for ${label}` }]}
                >
                  <DatePicker style={{ width: '100%' }} format="D MMMM, YYYY" />
                </Form.Item>
              );
            })}
          </>
        )}

        <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {mode === 'multi' ? 'Add to Selected Categories' : (editingVehicle ? 'Update' : 'Add')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VehicleModal;
