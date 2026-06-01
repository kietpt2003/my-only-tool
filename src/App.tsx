import React from 'react';
import { observer } from 'mobx-react-lite';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { useStore } from '@/store';
import '@/assets/styles/App.css';
import MainLayout from '@/layouts/MainLayout';
import LoginScreen from '@/features/auth/components/LoginScreen';
import JsonFormatter from './features/tools/components/JsonFormatter';
import SvgConverter from './features/tools/components/SvgConverter';
import ExcelEditor from './features/tools/components/ExcelEditor';
import RedminePortalScreen from './features/redmine/RedminePortalScreen';

// 👉 Bọc observer quanh Component
const App: React.FC = observer(() => {
  // Rút AuthStore ra dùng như một vị thần
  const {
    authStore: { isChecking, isAuthenticated, logout, checkAndSetToken }
  } = useStore();

  React.useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlToken = hashParams.get("token");
    const urlError = hashParams.get("error");

    if (urlError) {
      logout();
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(urlError === "access_denied" ? "Access Denied." : "Login Failed");
    } else {
      // Nhờ AuthStore xử lý token
      checkAndSetToken(urlToken);
      if (urlToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  if (isChecking) return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><p>Loading...</p></div>;

  if (!isAuthenticated) return <LoginScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/json-formatter" element={<JsonFormatter />} />
        <Route path="/svg-converter" element={<SvgConverter />} />
        <Route path="/excel-editor" element={<ExcelEditor />} />
        <Route path="/redmine" element={<RedminePortalScreen />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
});

export default App;
