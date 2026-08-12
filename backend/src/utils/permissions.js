// Shared permission shape used across the backend.
// Each module (licenses, vehicles) has independent view/add/edit/delete flags.
// `manage_users` is a single flag (not per-action) that controls the Users admin page.

const FULL_ACCESS = { view: true, add: true, edit: true, delete: true };
const VIEW_ONLY = { view: true, add: false, edit: false, delete: false };

const DEFAULT_PERMISSIONS_ADMIN = {
  licenses: { ...FULL_ACCESS },
  vehicles: { ...FULL_ACCESS },
  manage_users: true,
};

const DEFAULT_PERMISSIONS_VIEWER = {
  licenses: { ...VIEW_ONLY },
  vehicles: { ...VIEW_ONLY },
  manage_users: false,
};

// Normalizes/validates a permissions object coming from a client request,
// falling back to safe (view-only) defaults for anything missing or malformed.
function sanitizePermissions(input) {
  const safeModule = (mod) => ({
    view: !!mod?.view,
    add: !!mod?.add,
    edit: !!mod?.edit,
    delete: !!mod?.delete,
  });

  return {
    licenses: safeModule(input?.licenses),
    vehicles: safeModule(input?.vehicles),
    manage_users: !!input?.manage_users,
  };
}

function hasPermission(user, moduleName, action) {
  return !!user?.permissions?.[moduleName]?.[action];
}

function canManageUsers(user) {
  return !!user?.permissions?.manage_users;
}

module.exports = {
  DEFAULT_PERMISSIONS_ADMIN,
  DEFAULT_PERMISSIONS_VIEWER,
  sanitizePermissions,
  hasPermission,
  canManageUsers,
};
