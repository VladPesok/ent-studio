import React, { useState, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";
import { ConfigProvider, Layout, theme as antTheme } from "antd";
import enUS from "antd/locale/en_US";
import ukUA from "antd/locale/uk_UA";
import { useTranslation } from 'react-i18next';

import PatientsList    from "./components/PatientsList/PatientsList";
import PatientOverview from "./components/PatientOverview/PatientOverview";
import Settings        from "./components/Settings/Settings";

import { AppConfigProvider, AppConfigContext } from "./holders/AppConfig";
import AppHeader from "./wrappers/Header/Header";
import { AppSider } from "./wrappers/Sider/Sider";

import "./i18n";
import "./App.css";

const { Content } = Layout;
const { useToken } = antTheme;

const AppShell: React.FC = () => {
  const { locale } = React.useContext(AppConfigContext);
  const { i18n } = useTranslation();
  const antdLocale = locale === "en" ? enUS : ukUA;

  const [collapsed, setCollapsed] = useState(true);

  const { token } = useToken();

  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale, i18n]);

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        algorithm: antTheme.defaultAlgorithm,
        token: { colorPrimary: "#2563eb" },
      }}
    >
      <Layout className="app-container">
        <AppSider collapsed={collapsed} />
        <Layout>
          <AppHeader
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            token={token}
          />
          <Content className="app-content">
            <Routes>
              <Route
                path="/patients"
                element={<PatientsList/>}
              />
              <Route path="/patients/:id" element={<PatientOverview />} />
              <Route path="/settings"      element={<Settings />} />
              <Route
                path="*"
                element={<PatientsList/>}
              />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppConfigProvider>
      <AppShell />
    </AppConfigProvider>
  </HashRouter>
);

export default App;
