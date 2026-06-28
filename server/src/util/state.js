// Small mutable runtime holder shared across modules (no circular imports).
// superAdminId is set once at startup by ensureSuperAdmin(); audit() uses it to
// keep the Super Admin's own actions out of the audit log.
export const runtime = {
  superAdminId: null,
};
