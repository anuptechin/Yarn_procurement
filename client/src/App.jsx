import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { ToastProvider, Loading } from './components/ui.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Requirements from './pages/Requirements.jsx';
import RequirementForm from './pages/RequirementForm.jsx';
import RequirementDetail from './pages/RequirementDetail.jsx';
import Comparison from './pages/Comparison.jsx';
import Vendors from './pages/Vendors.jsx';
import VendorDetail from './pages/VendorDetail.jsx';
import Materials from './pages/Materials.jsx';
import Awards from './pages/Awards.jsx';
import VendorPortal from './pages/VendorPortal.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center"><Loading label="Starting portal…" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* public */}
        <Route path="/login" element={<Login />} />
        <Route path="/quote/:token" element={<VendorPortal />} />

        {/* authenticated */}
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/requirements" element={<Protected><Requirements /></Protected>} />
        <Route path="/requirements/new" element={<Protected><RequirementForm /></Protected>} />
        <Route path="/requirements/:id/edit" element={<Protected><RequirementForm /></Protected>} />
        <Route path="/requirements/:id" element={<Protected><RequirementDetail /></Protected>} />
        <Route path="/requirements/:id/compare" element={<Protected><Comparison /></Protected>} />
        <Route path="/vendors" element={<Protected><Vendors /></Protected>} />
        <Route path="/vendors/:id" element={<Protected><VendorDetail /></Protected>} />
        <Route path="/materials" element={<Protected><Materials /></Protected>} />
        <Route path="/awards" element={<Protected><Awards /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
