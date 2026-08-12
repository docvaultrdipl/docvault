import React from 'react';
import { Modal, Form, Input, Button, DatePicker, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const LicenseModal = ({ form, editingLicense, isModalVisible, onCancel, onSubmit, submitting }) => (
  <Modal
    title={editingLicense ? 'Edit Document' : 'Add New Document'}
    open={isModalVisible}
    onCancel={onCancel}
    footer={null}
    destroyOnClose
    width={520}
    style={{ maxWidth: '92vw' }}
  >
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item name="name" label="Document Name" rules={[{ required: true, message: 'Please enter document name' }]}>
        <Input placeholder="e.g. Driver License, Passport" />
      </Form.Item>
      <Form.Item name="key" label="License / ID Number" rules={[{ required: true, message: 'Please enter ID number' }]}>
        <Input placeholder="e.g. DL-123456789" />
      </Form.Item>
      <Form.Item name="type" label="Type">
        <Input placeholder="e.g. Software, Hardware, Server, Subscription" />
      </Form.Item>
      <Form.Item name="validity" label="Validity Date (From - To)" extra="Status updates automatically: Active, Expiring Soon (within 30 days), or Expired.">
        <RangePicker style={{ width: '100%' }} format="D MMMM, YYYY" />
      </Form.Item>

      <Form.Item name="remarks" label="Remarks">
        <TextArea rows={3} placeholder="Any additional notes about this document..." />
      </Form.Item>

      <Form.Item
        name="attachment"
        label="Document Attachment"
        valuePropName="fileList"
        getValueFromEvent={(e) => {
          if (Array.isArray(e)) { return e; }
          return e?.fileList;
        }}
      >
        <Upload beforeUpload={() => false} maxCount={1}>
          <Button icon={<UploadOutlined />}>Click to Attach File</Button>
        </Upload>
      </Form.Item>

      <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
        <Button onClick={onCancel} style={{ marginRight: 8 }}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={submitting}>{editingLicense ? 'Update' : 'Add'}</Button>
      </Form.Item>
    </Form>
  </Modal>
);

export default LicenseModal;
