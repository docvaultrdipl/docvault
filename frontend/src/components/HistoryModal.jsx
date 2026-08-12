import React from 'react';
import { Modal, List, Empty, Spin } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const ACTION_LABELS = {
  created: 'added this record',
  updated: 'edited this record',
  deleted: 'deleted this record',
};

const HistoryModal = ({ visible, onClose, recordLabel, entries, loading }) => (
  <Modal
    title={<span><HistoryOutlined style={{ marginRight: 8 }} />History{recordLabel ? ` — ${recordLabel}` : ''}</span>}
    open={visible}
    onCancel={onClose}
    footer={null}
    destroyOnClose
  >
    {loading ? (
      <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
    ) : entries.length === 0 ? (
      <Empty description="No history found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <List
        dataSource={entries}
        renderItem={(entry) => (
          <List.Item>
            <span>
              <strong>{entry.actor_name}</strong> {ACTION_LABELS[entry.action] || entry.action} — {dayjs(entry.created_at).format('D MMMM, YYYY, h:mm A')} ({dayjs(entry.created_at).fromNow()})
            </span>
          </List.Item>
        )}
      />
    )}
  </Modal>
);

export default HistoryModal;
