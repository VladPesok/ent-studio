import React, { useContext, useState } from "react";
import { Layout, Select, Input } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { GB, UA } from "country-flag-icons/react/3x2";
import { AppConfigContext, LocaleCode } from "../../holders/AppConfig";
import { theme as antTheme } from "antd";

import CreatableSelect from "../../common/input/CreatableSelect";


const UserSelect: React.FC = () => {
  const { currentDoctor, setCurrentDoctor, doctors, addDoctor } =
    useContext(AppConfigContext);

  return (
    <CreatableSelect
      value={currentDoctor}
      items={doctors}
      onChange={setCurrentDoctor}
      onCreate={addDoctor}
      placeholder="Guest"
      style={{width: 180}}
    />
  );
};

const LocaleSelect: React.FC = () => {
  const { locale, setLocale } = useContext(AppConfigContext);

  return (
    <Select<LocaleCode>
      value={locale}
      style={{ width: 80 }}
      onChange={setLocale}
      options={[
        {
          value: "en",
          label: (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <GB title="English" style={{ width: 18 }} /> EN
            </span>
          ),
        },
        {
          value: "ua",
          label: (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <UA title="Українська" style={{ width: 18 }} /> UA
            </span>
          ),
        },
      ]}
    />
  );
};


interface Props {
  collapsed: boolean;
  onToggle: () => void;
  token: ReturnType<typeof antTheme.useToken>["token"]; // reuse parent token
}

const AppHeader: React.FC<Props> = ({ collapsed, onToggle, token }) => (
  <Layout.Header
    style={{
      background: token.colorBgContainer,
      padding: "0 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    {collapsed ? (
      <MenuUnfoldOutlined
        style={{ fontSize: 18, cursor: "pointer" }}
        onClick={onToggle}
      />
    ) : (
      <MenuFoldOutlined
        style={{ fontSize: 18, cursor: "pointer" }}
        onClick={onToggle}
      />
    )}

    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <LocaleSelect />
      <UserSelect />
    </div>
  </Layout.Header>
);

export default AppHeader;
