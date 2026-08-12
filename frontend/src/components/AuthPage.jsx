import React, { useState } from 'react';
import { Card, Form, Input, Button, Spin } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { apiRequest } from '../api';

export const FullPageLoader = ({ tip = 'Loading...' }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    background: '#f0f2f5',
  }}>
    <Spin size="large" />
    <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 15 }}>{tip}</div>
  </div>
);

const AuthPage = ({ onAuthSuccess }) => {
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values) => {
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { identifier: values.identifier, password: values.password },
      });
      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
      padding: 16,
      boxSizing: 'border-box',
    }}>
      <Card style={{ width: 380, maxWidth: '100%', borderRadius: 8 }} bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#001529' }}>DocVault</div>
          <div style={{ color: 'rgba(0,0,0,0.45)' }}>Sign in to manage your documents and vehicles</div>
        </div>

        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="identifier"
            label="Email or Username"
            rules={[{ required: true, message: 'Please enter your email or username' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com or username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          {error && <div style={{ color: '#ff4d4f', marginBottom: 16 }}>{error}</div>}

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Log In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AuthPage;
