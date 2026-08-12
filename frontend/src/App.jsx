import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Menu, Button, Modal, Form, message } from 'antd';
import { DashboardOutlined, KeyOutlined, UserOutlined, CarOutlined, CalendarOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'antd/dist/reset.css';

import { apiRequest, TOKEN_STORAGE_KEY } from './api';
import AuthPage, { FullPageLoader } from './components/AuthPage';
import DashboardView from './components/DashboardView';
import LicensesView from './components/LicensesView';
import VehiclesView from './components/VehiclesView';
import CalendarView from './components/CalendarView';
import ProfileView from './components/ProfileView';
import LicenseModal from './components/LicenseModal';
import VehicleModal from './components/VehicleModal';
import HistoryModal from './components/HistoryModal';
import GlobalSearch from './components/GlobalSearch';
import BulkImportModal from './components/BulkImportModal';
import NotificationBell from './components/NotificationBell';

dayjs.extend(relativeTime);

const { Header, Content, Sider } = Layout;
const { confirm } = Modal;

const SIDER_WIDTH = 200;
const HEADER_HEIGHT = 64;

const LicenseTrackerApp = () => {
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState('dashboard');

  // --- Licenses state ---
  const [licenses, setLicenses] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [searchName, setSearchName] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- Vehicles state ---
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isVehicleModalVisible, setIsVehicleModalVisible] = useState(false);
  const [vehicleModalMode, setVehicleModalMode] = useState('single'); // 'single' | 'multi'
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
  const [vehicleForm] = Form.useForm();
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState('all');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('all');

  // --- Activity feed (shared across licenses + vehicles) ---
  const [activityLog, setActivityLog] = useState([]);

  // --- Per-record history modal ---
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [historyRecordLabel, setHistoryRecordLabel] = useState('');
  const [historyEntries, setHistoryEntries] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Bulk Excel import ---
  const [isBulkImportModalVisible, setIsBulkImportModalVisible] = useState(false);
  const [bulkImportModule, setBulkImportModule] = useState('licenses'); // 'licenses' | 'vehicles'
  const [bulkImporting, setBulkImporting] = useState(false);

  // --- Profile / user management state ---
  const [userProfile, setUserProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm] = Form.useForm();
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserForm] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isEditPermissionsModalVisible, setIsEditPermissionsModalVisible] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState(null);
  const [updatingPermissions, setUpdatingPermissions] = useState(false);
  const [permissionsForm] = Form.useForm();

  // Granular access rights derived from the logged-in user's permissions object.
  const perms = userProfile?.permissions || {};
  const canViewLicenses = !!perms.licenses?.view;
  const canAddLicense = !!perms.licenses?.add;
  const canEditLicense = !!perms.licenses?.edit;
  const canDeleteLicense = !!perms.licenses?.delete;
  const canViewVehicles = !!perms.vehicles?.view;
  const canAddVehicle = !!perms.vehicles?.add;
  const canEditVehicle = !!perms.vehicles?.edit;
  const canDeleteVehicle = !!perms.vehicles?.delete;
  const canManageUsers = !!perms.manage_users;

  // --- Data loading ---
  const fetchLicenses = useCallback(async (activeToken, canView) => {
    if (!canView) {
      setLicenses([]);
      return;
    }
    setLoadingLicenses(true);
    try {
      const data = await apiRequest('/documents', { token: activeToken });
      setLicenses(data);
    } catch (err) {
      message.error(err.message || 'Failed to load documents');
    } finally {
      setLoadingLicenses(false);
    }
  }, []);

  const fetchVehicles = useCallback(async (activeToken, canView) => {
    if (!canView) {
      setVehicles([]);
      return;
    }
    setLoadingVehicles(true);
    try {
      const data = await apiRequest('/vehicles', { token: activeToken });
      setVehicles(data);
    } catch (err) {
      message.error(err.message || 'Failed to load vehicle records');
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  const fetchActivity = useCallback(async (activeToken) => {
    try {
      const data = await apiRequest('/activity', { token: activeToken });
      setActivityLog(data);
    } catch (err) {
      console.error('Failed to load activity log', err);
    }
  }, []);

  const fetchUsers = useCallback(async (activeToken) => {
    setLoadingUsers(true);
    try {
      const data = await apiRequest('/users', { token: activeToken });
      setUsers(data);
    } catch (err) {
      // Non-admins get a 403 here — expected, nothing to show for them.
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (token && canManageUsers) {
      fetchUsers(token);
    }
  }, [token, canManageUsers, fetchUsers]);

  const refreshAll = useCallback(async (activeToken, permissions) => {
    await Promise.all([
      fetchLicenses(activeToken, !!permissions?.licenses?.view),
      fetchVehicles(activeToken, !!permissions?.vehicles?.view),
      fetchActivity(activeToken),
    ]);
  }, [fetchLicenses, fetchVehicles, fetchActivity]);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) {
      setAuthChecked(true);
      return;
    }
    (async () => {
      try {
        const profile = await apiRequest('/profile', { token: savedToken });
        setToken(savedToken);
        setUserProfile(profile);
        await refreshAll(savedToken, profile.permissions);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [refreshAll]);

  const handleAuthSuccess = async (newToken, user) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setUserProfile(user);
    setAppLoading(true);
    try {
      await refreshAll(newToken, user.permissions);
    } finally {
      setAppLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUserProfile(null);
    setLicenses([]);
    setVehicles([]);
    setActivityLog([]);
    setSelectedMenuItem('dashboard');
  };

  // --- License helpers ---
  const showModal = (licenseToEdit = null) => {
    setEditingLicense(licenseToEdit);
    if (licenseToEdit) {
      form.setFieldsValue({
        name: licenseToEdit.name,
        key: licenseToEdit.license_key,
        type: licenseToEdit.type,
        remarks: licenseToEdit.remarks,
        validity: licenseToEdit.validity_start && licenseToEdit.validity_end
          ? [dayjs(licenseToEdit.validity_start), dayjs(licenseToEdit.validity_end)]
          : undefined,
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingLicense(null);
    form.resetFields();
  };

  const showDeleteConfirm = (id) => {
    confirm({
      title: 'Are you sure you want to delete this document record?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      async onOk() {
        try {
          await apiRequest(`/documents/${id}`, { method: 'DELETE', token });
          message.success('Document deleted');
          refreshAll(token, perms);
        } catch (err) {
          message.error(err.message || 'Failed to delete document');
        }
      },
    });
  };

  const goToLicensesFilteredBy = (status) => {
    setStatusFilter(status);
    setSearchName('');
    setSearchKey('');
    setSelectedMenuItem('licenses');
  };

  const handleLicenseFormSubmit = async (values) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('license_key', values.key);
      formData.append('type', values.type || '');
      formData.append('remarks', values.remarks || '');
      if (values.validity && values.validity.length === 2) {
        formData.append('validity_start', values.validity[0].format('YYYY-MM-DD'));
        formData.append('validity_end', values.validity[1].format('YYYY-MM-DD'));
      }
      const uploadedFile = values.attachment?.[0]?.originFileObj;
      if (uploadedFile) {
        formData.append('attachment', uploadedFile);
      }

      if (editingLicense) {
        await apiRequest(`/documents/${editingLicense.id}`, { method: 'PUT', token, body: formData, isFormData: true });
        message.success('Document updated');
      } else {
        await apiRequest('/documents', { method: 'POST', token, body: formData, isFormData: true });
        message.success('Document added');
      }
      await refreshAll(token, perms);
      handleCancel();
    } catch (err) {
      message.error(err.message || 'Failed to save document');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Vehicle helpers ---
  const showVehicleModal = (mode, vehicleToEdit = null) => {
    setVehicleModalMode(mode);
    setEditingVehicle(vehicleToEdit);
    if (vehicleToEdit) {
      vehicleForm.setFieldsValue({
        category: vehicleToEdit.category,
        user_name: vehicleToEdit.user_name,
        place: vehicleToEdit.place,
        vehicle_type: vehicleToEdit.vehicle_type,
        vehicle_number: vehicleToEdit.vehicle_number,
        validity: vehicleToEdit.validity ? dayjs(vehicleToEdit.validity) : undefined,
      });
    } else {
      vehicleForm.resetFields();
    }
    setIsVehicleModalVisible(true);
  };

  const handleVehicleCancel = () => {
    setIsVehicleModalVisible(false);
    setEditingVehicle(null);
    vehicleForm.resetFields();
  };

  const showVehicleDeleteConfirm = (id) => {
    confirm({
      title: 'Are you sure you want to delete this vehicle record?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      async onOk() {
        try {
          await apiRequest(`/vehicles/${id}`, { method: 'DELETE', token });
          message.success('Vehicle record deleted');
          refreshAll(token, perms);
        } catch (err) {
          message.error(err.message || 'Failed to delete vehicle record');
        }
      },
    });
  };

  const goToVehiclesFilteredBy = (status) => {
    setVehicleStatusFilter(status);
    setVehicleSearchQuery('');
    setVehicleCategoryFilter('all');
    setSelectedMenuItem('vehicles');
  };

  const handleVehicleFormSubmit = async (values) => {
    setVehicleSubmitting(true);
    try {
      if (vehicleModalMode === 'multi') {
        const entries = (values.categories || []).map((cat) => ({
          category: cat,
          validity: values.validity_by_category?.[cat]?.format('YYYY-MM-DD'),
        }));
        await apiRequest('/vehicles/multi', {
          method: 'POST',
          token,
          body: {
            user_name: values.user_name,
            place: values.place,
            vehicle_type: values.vehicle_type,
            vehicle_number: values.vehicle_number,
            entries,
          },
        });
        message.success('Vehicle added to selected categories');
      } else {
        const formData = new FormData();
        formData.append('category', values.category);
        formData.append('user_name', values.user_name);
        formData.append('place', values.place || '');
        formData.append('vehicle_type', values.vehicle_type || '');
        formData.append('vehicle_number', values.vehicle_number);
        formData.append('validity', values.validity?.format('YYYY-MM-DD'));
        const uploadedFile = values.attachment?.[0]?.originFileObj;
        if (uploadedFile) {
          formData.append('attachment', uploadedFile);
        }

        if (editingVehicle) {
          await apiRequest(`/vehicles/${editingVehicle.id}`, { method: 'PUT', token, body: formData, isFormData: true });
          message.success('Vehicle record updated');
        } else {
          await apiRequest('/vehicles', { method: 'POST', token, body: formData, isFormData: true });
          message.success('Vehicle record added');
        }
      }
      await refreshAll(token, perms);
      handleVehicleCancel();
    } catch (err) {
      message.error(err.message || 'Failed to save vehicle record');
    } finally {
      setVehicleSubmitting(false);
    }
  };

  // Sidebar navigation always resets to the unfiltered list for the section
  // being opened — only dashboard cards apply a specific status filter.
  const handleMenuClick = ({ key }) => {
    if (key === 'licenses') {
      setStatusFilter('all');
      setSearchName('');
      setSearchKey('');
    }
    if (key === 'vehicles') {
      setVehicleStatusFilter('all');
      setVehicleSearchQuery('');
      setVehicleCategoryFilter('all');
    }
    setSelectedMenuItem(key);
  };

  const handleProfileUpdate = async (values) => {
    try {
      const updated = await apiRequest('/profile', { method: 'PUT', token, body: { name: values.name, email: values.email, username: values.username || null } });
      setUserProfile(updated);
      setEditingProfile(false);
      message.success('Profile updated');
    } catch (err) {
      message.error(err.message || 'Failed to update profile');
    }
  };

  const handleCreateUser = async (values) => {
    setCreatingUser(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        token,
        body: { name: values.name, email: values.email, username: values.username || null, password: values.password, permissions: values.permissions },
      });
      message.success(`User "${values.name}" created. They can now log in with their email${values.username ? ' or username' : ''} and password.`);
      createUserForm.resetFields();
      setIsCreateUserModalVisible(false);
      fetchUsers(token);
    } catch (err) {
      message.error(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenEditPermissions = (targetUser) => {
    setEditingPermissionsUser(targetUser);
    permissionsForm.setFieldsValue({ permissions: targetUser.permissions });
    setIsEditPermissionsModalVisible(true);
  };

  const handleCloseEditPermissions = () => {
    setIsEditPermissionsModalVisible(false);
    setEditingPermissionsUser(null);
    permissionsForm.resetFields();
  };

  const handleUpdatePermissions = async (values) => {
    if (!editingPermissionsUser) return;
    setUpdatingPermissions(true);
    try {
      await apiRequest(`/users/${editingPermissionsUser.id}`, { method: 'PUT', token, body: { permissions: values.permissions } });
      message.success('Rights updated');
      fetchUsers(token);
      handleCloseEditPermissions();
    } catch (err) {
      message.error(err.message || 'Failed to update rights');
    } finally {
      setUpdatingPermissions(false);
    }
  };

  const handleDeleteUser = (userId) => {
    confirm({
      title: 'Remove this user?',
      icon: <ExclamationCircleOutlined />,
      content: 'They will no longer be able to log in.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      async onOk() {
        try {
          await apiRequest(`/users/${userId}`, { method: 'DELETE', token });
          message.success('User removed');
          fetchUsers(token);
        } catch (err) {
          message.error(err.message || 'Failed to remove user');
        }
      },
    });
  };

  // --- Per-record history ---
  const showHistory = async (entityType, record, label) => {
    setHistoryRecordLabel(label);
    setIsHistoryModalVisible(true);
    setLoadingHistory(true);
    try {
      const data = await apiRequest(`/activity/${entityType}/${record.id}`, { token });
      setHistoryEntries(data);
    } catch (err) {
      message.error(err.message || 'Failed to load history');
      setHistoryEntries([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseHistory = () => {
    setIsHistoryModalVisible(false);
    setHistoryEntries([]);
    setHistoryRecordLabel('');
  };

  // --- Global search: jump to a matched record's section, pre-filtered ---
  const handleGlobalSelectLicense = (license) => {
    setSelectedMenuItem('licenses');
    setSearchName(license.name);
    setSearchKey('');
    setStatusFilter('all');
  };

  const handleGlobalSelectVehicle = (vehicle) => {
    setSelectedMenuItem('vehicles');
    setVehicleSearchQuery(vehicle.user_name || vehicle.vehicle_number);
    setVehicleCategoryFilter('all');
    setVehicleStatusFilter('all');
  };

  // --- Bulk Excel import ---
  const openBulkImport = (moduleType) => {
    setBulkImportModule(moduleType);
    setIsBulkImportModalVisible(true);
  };

  const handleCloseBulkImport = () => {
    setIsBulkImportModalVisible(false);
  };

  const handleBulkImport = async (rows) => {
    setBulkImporting(true);
    try {
      const endpoint = bulkImportModule === 'licenses' ? '/documents/bulk' : '/vehicles/bulk';
      const result = await apiRequest(endpoint, { method: 'POST', token, body: { rows } });
      if (result.errors && result.errors.length > 0) {
        Modal.warning({
          title: `Imported ${result.successCount} of ${result.totalRows} records`,
          content: (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {result.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          ),
        });
      } else {
        message.success(`Imported ${result.successCount} record(s) successfully`);
      }
      await refreshAll(token, perms);
      handleCloseBulkImport();
    } catch (err) {
      message.error(err.message || 'Bulk import failed');
    } finally {
      setBulkImporting(false);
    }
  };

  // --- Derived data ---
  const filteredLicenses = useMemo(() => {
    const nameQuery = searchName.trim().toLowerCase();
    const keyQuery = searchKey.trim().toLowerCase();
    return licenses
      .filter((l) => !nameQuery || (l.name || '').toLowerCase().includes(nameQuery))
      .filter((l) => !keyQuery || (l.license_key || '').toLowerCase().includes(keyQuery))
      .filter((l) => statusFilter === 'all' || l.status === statusFilter)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [licenses, searchName, searchKey, statusFilter]);

  const licenseCounts = useMemo(() => ({
    total: licenses.length,
    active: licenses.filter((l) => l.status === 'Active').length,
    expiringSoon: licenses.filter((l) => l.status === 'Expiring Soon').length,
    expired: licenses.filter((l) => l.status === 'Expired').length,
  }), [licenses]);

  const filteredVehicles = useMemo(() => {
    const query = vehicleSearchQuery.trim().toLowerCase();
    return vehicles
      .filter((v) => !query || [v.user_name, v.place, v.vehicle_type, v.vehicle_number]
        .some((field) => (field || '').toLowerCase().includes(query)))
      .filter((v) => vehicleCategoryFilter === 'all' || v.category === vehicleCategoryFilter)
      .filter((v) => vehicleStatusFilter === 'all' || v.status === vehicleStatusFilter)
      .sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));
  }, [vehicles, vehicleSearchQuery, vehicleCategoryFilter, vehicleStatusFilter]);

  const vehicleCounts = useMemo(() => ({
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === 'Active').length,
    expiringSoon: vehicles.filter((v) => v.status === 'Expiring Soon').length,
    expired: vehicles.filter((v) => v.status === 'Expired').length,
  }), [vehicles]);

  // Combined feed for the Renewal Calendar: every license/vehicle that has an
  // expiry date, tagged with its type so the calendar can label + color it.
  const calendarItems = useMemo(() => {
    const licenseItems = licenses
      .filter((l) => l.validity_end)
      .map((l) => ({ type: 'License', name: l.name, date: l.validity_end, status: l.status }));
    const vehicleItems = vehicles
      .filter((v) => v.validity)
      .map((v) => ({ type: 'Vehicle', name: `${v.user_name} (${v.vehicle_number})`, date: v.validity, status: v.status }));
    return [...licenseItems, ...vehicleItems];
  }, [licenses, vehicles]);

  // --- Main layout rendering ---
  const renderContent = () => {
    switch (selectedMenuItem) {
      case 'dashboard':
        return (
          <DashboardView
            licenseCounts={licenseCounts}
            vehicleStats={vehicleCounts}
            vehicles={vehicles}
            activityLog={activityLog}
            onLicenseCardClick={goToLicensesFilteredBy}
            onVehicleCardClick={goToVehiclesFilteredBy}
            onAddDocument={() => showModal()}
            onAddVehicle={() => showVehicleModal('single')}
            canAddDocument={canAddLicense}
            canAddVehicle={canAddVehicle}
          />
        );
      case 'calendar':
        return <CalendarView calendarItems={calendarItems} />;
      case 'licenses':
        return (
          <LicensesView
            filteredLicenses={filteredLicenses}
            loadingLicenses={loadingLicenses}
            searchName={searchName}
            setSearchName={setSearchName}
            searchKey={searchKey}
            setSearchKey={setSearchKey}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onAdd={() => showModal()}
            onEdit={showModal}
            onDelete={showDeleteConfirm}
            onShowHistory={(record) => showHistory('license', record, record.name)}
            onBulkImport={() => openBulkImport('licenses')}
            canAdd={canAddLicense}
            canEdit={canEditLicense}
            canDelete={canDeleteLicense}
          />
        );
      case 'vehicles':
        return (
          <VehiclesView
            filteredVehicles={filteredVehicles}
            loadingVehicles={loadingVehicles}
            searchQuery={vehicleSearchQuery}
            setSearchQuery={setVehicleSearchQuery}
            categoryFilter={vehicleCategoryFilter}
            setCategoryFilter={setVehicleCategoryFilter}
            statusFilter={vehicleStatusFilter}
            setStatusFilter={setVehicleStatusFilter}
            onAdd={() => showVehicleModal('single')}
            onAddMulti={() => showVehicleModal('multi')}
            onEdit={(record) => showVehicleModal('single', record)}
            onDelete={showVehicleDeleteConfirm}
            onShowHistory={(record) => showHistory('vehicle', record, `${record.vehicle_number} (${record.category.toUpperCase()})`)}
            onBulkImport={() => openBulkImport('vehicles')}
            canAdd={canAddVehicle}
            canEdit={canEditVehicle}
            canDelete={canDeleteVehicle}
          />
        );
      case 'profile':
        return (
          <ProfileView
            userProfile={userProfile}
            editingProfile={editingProfile}
            setEditingProfile={setEditingProfile}
            profileForm={profileForm}
            onProfileSubmit={handleProfileUpdate}
            isCreateUserModalVisible={isCreateUserModalVisible}
            setIsCreateUserModalVisible={setIsCreateUserModalVisible}
            creatingUser={creatingUser}
            createUserForm={createUserForm}
            onCreateUserSubmit={handleCreateUser}
            canManageUsers={canManageUsers}
            users={users}
            loadingUsers={loadingUsers}
            currentUserId={userProfile?.id}
            isEditPermissionsModalVisible={isEditPermissionsModalVisible}
            editingPermissionsUser={editingPermissionsUser}
            permissionsForm={permissionsForm}
            updatingPermissions={updatingPermissions}
            onOpenEditPermissions={handleOpenEditPermissions}
            onCloseEditPermissions={handleCloseEditPermissions}
            onUpdatePermissions={handleUpdatePermissions}
            onDeleteUser={handleDeleteUser}
          />
        );
      default:
        return null;
    }
  };

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    ...((canViewLicenses || canViewVehicles) ? [{ key: 'calendar', icon: <CalendarOutlined />, label: 'Renewal Calendar' }] : []),
    ...(canViewLicenses ? [{ type: 'group', label: 'Licenses', children: [{ key: 'licenses', icon: <KeyOutlined />, label: 'Documents' }] }] : []),
    ...(canViewVehicles ? [{ type: 'group', label: 'Insurance', children: [{ key: 'vehicles', icon: <CarOutlined />, label: 'Vehicles' }] }] : []),
    { type: 'group', label: 'Admin', children: [{ key: 'profile', icon: <UserOutlined />, label: 'Profile' }] },
  ];

  if (!authChecked) {
    return <FullPageLoader tip="Checking your session..." />;
  }

  if (!token) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (appLoading) {
    return <FullPageLoader tip="Loading your data..." />;
  }

  return (
    <Layout style={{ minHeight: '100vh', overflow: 'hidden' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        onBreakpoint={(broken) => setSiderCollapsed(broken)}
        theme="dark"
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          height: '100vh',
          overflow: 'auto',
          zIndex: 100,
          background: '#001529',
        }}
      >
        <div className="logo" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', color: '#fff', lineHeight: '32px', fontWeight: 'bold' }}>DocVault</div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedMenuItem]} onClick={handleMenuClick} items={menuItems} />
      </Sider>
      <Layout style={{ marginInlineStart: siderCollapsed ? 0 : SIDER_WIDTH, transition: 'margin-inline-start 0.2s' }}>
        <Header style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          height: HEADER_HEIGHT,
          position: 'fixed',
          top: 0,
          insetInlineStart: siderCollapsed ? 0 : SIDER_WIDTH,
          insetInlineEnd: 0,
          zIndex: 99,
          transition: 'inset-inline-start 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <NotificationBell calendarItems={calendarItems} token={token} canManageUsers={canManageUsers} />
          <GlobalSearch
            licenses={licenses}
            vehicles={vehicles}
            onSelectLicense={handleGlobalSelectLicense}
            onSelectVehicle={handleGlobalSelectVehicle}
          />
          <span style={{ marginRight: 16, marginLeft: 'auto' }} className="header-welcome">Welcome, {userProfile?.name}</span>
          <Button onClick={handleLogout}>Log Out</Button>
        </Header>
        <Content style={{
          marginTop: HEADER_HEIGHT,
          padding: 24,
          background: '#f0f2f5',
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          overflowY: 'auto',
        }}>
          {renderContent()}
        </Content>
      </Layout>

      <LicenseModal
        form={form}
        editingLicense={editingLicense}
        isModalVisible={isModalVisible}
        onCancel={handleCancel}
        onSubmit={handleLicenseFormSubmit}
        submitting={submitting}
      />

      <VehicleModal
        mode={vehicleModalMode}
        form={vehicleForm}
        editingVehicle={editingVehicle}
        isVisible={isVehicleModalVisible}
        onCancel={handleVehicleCancel}
        onSubmit={handleVehicleFormSubmit}
        submitting={vehicleSubmitting}
      />

      <HistoryModal
        visible={isHistoryModalVisible}
        onClose={handleCloseHistory}
        recordLabel={historyRecordLabel}
        entries={historyEntries}
        loading={loadingHistory}
      />

      <BulkImportModal
        visible={isBulkImportModalVisible}
        onCancel={handleCloseBulkImport}
        moduleType={bulkImportModule}
        onImport={handleBulkImport}
        importing={bulkImporting}
      />
    </Layout>
  );
};

export default LicenseTrackerApp;
