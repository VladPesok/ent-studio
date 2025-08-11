import React from "react";
import { Layout, Menu } from "antd";
import { UserOutlined, SettingOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";

interface Props {
  collapsed: boolean;
}

export const AppSider: React.FC<Props> = ({ collapsed }) => {
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
      label: "Patients",
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: "Settings",
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
