import React, { useMemo, useState, useEffect } from 'react';
import { Popover, Badge, Button, List, Empty, message, Input, Tag } from 'antd';
import { BellOutlined, MailOutlined, PlusOutlined, CloseOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiRequest } from '../api';

const STATUS_COLOR = {
  'Expired': '#f5222d',
  'Expiring Soon': '#faad14',
};

const NotificationBell = ({ calendarItems, token, canManageUsers }) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [savingRecipients, setSavingRecipients] = useState(false);

  const alertItems = useMemo(() => {
    return calendarItems
      .filter((item) => item.status === 'Expired' || item.status === 'Expiring Soon')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [calendarItems]);

  // Load the current recipient list once, when a manager opens the bell.
  useEffect(() => {
    if (open && canManageUsers && recipients.length === 0 && !loadingRecipients) {
      setLoadingRecipients(true);
      apiRequest('/notifications/recipients', { token })
        .then((data) => setRecipients(data.recipients || []))
        .catch(() => {})
        .finally(() => setLoadingRecipients(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canManageUsers]);

  const saveRecipients = async (nextList) => {
    setSavingRecipients(true);
    try {
      const data = await apiRequest('/notifications/recipients', { method: 'PUT', token, body: { recipients: nextList } });
      setRecipients(data.recipients || []);
    } catch (err) {
      message.error(err.message || 'Failed to save recipients');
    } finally {
      setSavingRecipients(false);
    }
  };

  const handleAddEmail = () => {
    const email = newEmail.trim();
    if (!email) return;
    if (recipients.includes(email)) {
      setNewEmail('');
      return;
    }
    const next = [...recipients, email];
    setRecipients(next);
    setNewEmail('');
    saveRecipients(next);
  };

  const handleRemoveEmail = (email) => {
    const next = recipients.filter((r) => r !== email);
    setRecipients(next);
    saveRecipients(next);
  };

  const handleSendDigestNow = async () => {
    setSending(true);
    try {
      const result = await apiRequest('/notifications/send-digest', { method: 'POST', token });
      message.success(result.message || 'Digest email sent');
    } catch (err) {
      message.error(err.message || 'Failed to send digest email');
    } finally {
      setSending(false);
    }
  };

  const content = (
    <div style={{ width: 320, maxHeight: 460, overflowY: 'auto' }}>
      {alertItems.length === 0 ? (
        <Empty description="Nothing expiring right now" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={alertItems.slice(0, 20)}
          renderItem={(item) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 13 }}>{item.type}: {item.name}</div>
                <div style={{ fontSize: 12, color: STATUS_COLOR[item.status] }}>
                  {item.status} — {dayjs(item.date).format('D MMMM, YYYY')}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}

      {canManageUsers && (
        <>
          <Button
            block
            size="small"
            icon={<MailOutlined />}
            style={{ marginTop: 12 }}
            loading={sending}
            onClick={handleSendDigestNow}
          >
            Send Email Reminder Now
          </Button>

          <Button
            block
            type="text"
            size="small"
            icon={<SettingOutlined />}
            style={{ marginTop: 6 }}
            onClick={() => setShowSettings((v) => !v)}
          >
            {showSettings ? 'Hide' : 'Manage'} Reminder Recipients
          </Button>

          {showSettings && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>
                Emails that receive the expiry reminder:
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {recipients.length === 0 && !loadingRecipients && (
                  <span style={{ fontSize: 12, color: '#999' }}>No recipients added yet.</span>
                )}
                {recipients.map((email) => (
                  <Tag
                    key={email}
                    closable
                    onClose={(e) => { e.preventDefault(); handleRemoveEmail(email); }}
                    closeIcon={<CloseOutlined style={{ fontSize: 10 }} />}
                  >
                    {email}
                  </Tag>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  size="small"
                  placeholder="new-email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onPressEnter={handleAddEmail}
                />
                <Button size="small" icon={<PlusOutlined />} loading={savingRecipients} onClick={handleAddEmail} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <Popover
      title="Expiring & Expired"
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={alertItems.length} size="small" overflowCount={99}>
        <Button shape="circle" icon={<BellOutlined />} />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;
