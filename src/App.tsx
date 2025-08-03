import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { ConfigProvider, Layout, theme as antTheme } from "antd";
import enUS from "antd/locale/en_US";
import ukUA from "antd/locale/uk_UA";

import PatientsList    from "./components/PatientsList/PatientsList";
import PatientOverview from "./components/PatientOverview/PatientOverview";
import Settings        from "./components/Settings/Settings";

import { AppConfigProvider, AppConfigContext } from "./holders/AppConfig";
import AppHeader from "./wrappers/Header/Header";
import AppSider  from "./wrappers/Sider/Sider";

import "./App.css";

const { Content } = Layout;
const { useToken } = antTheme;

const AppShell: React.FC = () => {
  const { locale } = React.useContext(AppConfigContext);
  const antdLocale = locale === "en" ? enUS : ukUA;

  const [collapsed, setCollapsed] = useState(true);

  const { token } = useToken();

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        algorithm: antTheme.defaultAlgorithm,
        token: { colorPrimary: "#2563eb" },
      }}
    >
      <Layout style={{ minHeight: "100vh" }}>
        <AppSider collapsed={collapsed} token={token} />
        <Layout>
          <AppHeader
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            token={token}
          />
          <Content
            style={{
              margin: 24,
              padding: 24,
              background: token.colorBgContainer,
            }}
          >
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
  <BrowserRouter>
    <AppConfigProvider>
      <AppShell />
    </AppConfigProvider>
  </BrowserRouter>
);

export default App;
