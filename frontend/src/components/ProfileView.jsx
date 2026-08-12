import React from 'react';
import { Card, Avatar, Button, Form, Input, Descriptions, Modal, Table, Tag } from 'antd';
import { UserOutlined, PlusOutlined, SafetyOutlined } from '@ant-design/icons';
import PermissionsFields from './PermissionsFields';

const ProfileView = ({
  userProfile,
  editingProfile,
  setEditingProfile,
  profileForm,
  onProfileSubmit,
  isCreateUserModalVisible,
  setIsCreateUserModalVisible,
  creatingUser,
  createUserForm,
  onCreateUserSubmit,
  canManageUsers,
  users,
  loadingUsers,
  currentUserId,
  isEditPermissionsModalVisible,
  editingPermissionsUser,
  permissionsForm,
  updatingPermissions,
  onOpenEditPermissions,
  onCloseEditPermissions,
  onUpdatePermissions,
  onDeleteUser,
}) => {
  const userColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Username', dataIndex: 'username', key: 'username', render: (v) => v || <span style={{ color: '#999' }}>—</span> },
    {
      title: 'Access',
      key: 'access',
      render: (_, record) => (
        record.id === currentUserId ? (
          <Tag color="blue">{record.role} (you)</Tag>
        ) : (
          <Tag color={record.permissions?.manage_users ? 'blue' : 'default'}>{record.role}</Tag>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        record.id === currentUserId ? null : (
          <span>
            <Button size="small" icon={<SafetyOutlined />} onClick={() => onOpenEditPermissions(record)} style={{ marginRight: 8 }}>
              Edit Rights
            </Button>
            <Button danger size="small" onClick={() => onDeleteUser(record.id)}>Remove</Button>
          </span>
        )
      ),
    },
  ];

  return (
    <Card bordered={false}>
       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: '24px' }}>
          <Avatar size={64} icon={<UserOutlined />} style={{ marginRight: '24px' }} />
          <div>
            <h2>{userProfile?.name}</h2>
            <p style={{ color: 'rgba(0, 0, 0, 0.65)' }}>{userProfile?.email}</p>
          </div>
          <Button
            type={editingProfile ? "default" : "primary"}
            onClick={() => {
              if (editingProfile) {
                profileForm.resetFields();
              } else {
                profileForm.setFieldsValue(userProfile);
              }
              setEditingProfile(!editingProfile);
            }}
            style={{marginLeft: 'auto'}}
          >
            {editingProfile ? 'Cancel' : 'Edit Profile'}
          </Button>
          {canManageUsers && (
            <Button icon={<PlusOutlined />} onClick={() => setIsCreateUserModalVisible(true)}>
              Create New User
            </Button>
          )}
       </div>

      {editingProfile ? (
         <Form form={profileForm} layout="vertical" onFinish={onProfileSubmit}>
             <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please enter your name' }]}><Input /></Form.Item>
             <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Please enter a valid email' }]}><Input /></Form.Item>
             <Form.Item label="Username (optional)" name="username" extra="Lets you log in with a username instead of your email."><Input /></Form.Item>
             <Form.Item label="Role" name="role"><Input disabled/></Form.Item>
             <Form.Item><Button type="primary" htmlType="submit">Save Changes</Button></Form.Item>
         </Form>
      ) : (
         <Descriptions title="User Information" bordered column={1}>
           <Descriptions.Item label="Name">{userProfile?.name}</Descriptions.Item>
           <Descriptions.Item label="Email">{userProfile?.email}</Descriptions.Item>
           <Descriptions.Item label="Username">{userProfile?.username || <span style={{ color: '#999' }}>Not set</span>}</Descriptions.Item>
           <Descriptions.Item label="Role">{userProfile?.role}</Descriptions.Item>
         </Descriptions>
      )}

      {canManageUsers && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 12 }}>Manage Users</h3>
          <Table
            dataSource={users}
            columns={userColumns}
            rowKey="id"
            loading={loadingUsers}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 700 }}
          />
        </div>
      )}

      {/* Create New User */}
      <Modal
        title="Create New User"
        open={isCreateUserModalVisible}
        onCancel={() => { setIsCreateUserModalVisible(false); createUserForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createUserForm}
          layout="vertical"
          onFinish={onCreateUserSubmit}
          initialValues={{
            permissions: {
              licenses: { view: true, add: false, edit: false, delete: false },
              vehicles: { view: true, add: false, edit: false, delete: false },
              manage_users: false,
            },
          }}
        >
          <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter a name' }]}>
            <Input placeholder="Full name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter an email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>
          <Form.Item name="username" label="Username (optional)" extra="Lets this person log in with a username instead of their email.">
            <Input placeholder="e.g. priya.sharma" />
          </Form.Item>

          <PermissionsFields />

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Button onClick={() => { setIsCreateUserModalVisible(false); createUserForm.resetFields(); }} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={creatingUser}>Create User</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Rights for an existing user */}
      <Modal
        title={editingPermissionsUser ? `Edit Rights — ${editingPermissionsUser.name}` : 'Edit Rights'}
        open={isEditPermissionsModalVisible}
        onCancel={onCloseEditPermissions}
        footer={null}
        destroyOnClose
      >
        <Form form={permissionsForm} layout="vertical" onFinish={onUpdatePermissions}>
          <PermissionsFields />
          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Button onClick={onCloseEditPermissions} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={updatingPermissions}>Save Rights</Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ProfileView;
