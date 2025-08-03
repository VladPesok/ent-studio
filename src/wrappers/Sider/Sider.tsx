import React from "react";
import { Layout, Menu } from "antd";
import {
  UserOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { theme as antTheme } from "antd";

interface Props {
  collapsed: boolean;
  token: ReturnType<typeof antTheme.useToken>["token"];
}

const AppSider: React.FC<Props> = ({ collapsed, token }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedMenu = location.pathname.startsWith("/settings")
    ? "settings"
    : "patients";

  return (
    <Layout.Sider
      collapsed={collapsed}
      width={200}
      trigger={null}
      theme="light"
      style={{ background: token.colorBgContainer }}
    >
      <Menu
        mode="inline"
        selectedKeys={[selectedMenu]}
        onClick={({ key }) =>
          navigate(key === "patients" ? "/patients" : "/settings")
        }
        items={[
          { key: "patients", icon: <UserOutlined />,    label: "Patients" },
          { key: "settings", icon: <SettingOutlined />, label: "Settings" },
        ]}
      />
    </Layout.Sider>
  );
};

export default AppSider;
