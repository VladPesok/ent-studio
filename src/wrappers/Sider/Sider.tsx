import React from "react";
import { Layout, Menu } from "antd";
import { UserOutlined, SettingOutlined, ExperimentOutlined, BookOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Props {
  collapsed: boolean;
}

export const AppSider: React.FC<Props> = ({ collapsed }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Only show navigation menu on main pages, not in patient overview
  const isPatientOverview = location.pathname.startsWith('/patient/');

  if (isPatientOverview) {
    return null; // Don't render sider in patient overview
  }

  const menuItems = [
    {
      key: "/",
      icon: <UserOutlined />,
      label: t('sider.patients'),
    },
    {
      key: "/tests",
      icon: <ExperimentOutlined />,
      label: t('sider.testConstructor'),
    },
    {
      key: "/dictionaries",
      icon: <BookOutlined />,
      label: t('sider.dictionaries'),
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: t('sider.settings'),
    },
  ];

  return (
    <Layout.Sider 
      theme="light" 
      width={200} 
      collapsed={collapsed}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onSelect={({ key }) => navigate(key)}
      />
    </Layout.Sider>
  );
};
