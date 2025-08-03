import React, { useContext, useState } from "react";
import { Layout, Select, Input } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { GB, UA } from "country-flag-icons/react/3x2";
import { AppConfigContext, LocaleCode } from "../../holders/AppConfig";
import { theme as antTheme } from "antd";


const UserSelect: React.FC = () => {
  const { currentDoctor, setCurrentDoctor, doctors, addDoctor } = useContext(AppConfigContext);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const trimmed = search.trim();
  const filtered = doctors.filter((u) =>
    u.toLowerCase().includes(trimmed.toLowerCase())
  );

  const options = [
    ...filtered.map((u) => ({ value: u, label: u })),
    ...(filtered.length === 0 && trimmed
      ? [{ value: trimmed, label: trimmed }]
      : []),
  ];

  const selectUser = (name: string | null | undefined) => {
    if (!name) {
      setCurrentDoctor(null);
      return;
    }
    if (!doctors.includes(name)) addDoctor(name); // add on-the-fly
    setCurrentDoctor(name);
  };

  const handleEnter = () => {
    if (trimmed) {
      selectUser(trimmed);
      setSearch("");
      setOpen(false);
    }
  };

  return (
    <Select<string>
      value={currentDoctor ?? undefined}      /* default = null */
      placeholder="Guest"                  /* just a placeholder */
      style={{ width: 180 }}
      open={open}
      showSearch={false}                   /* we supply our own input */
      allowClear
      onClear={() => setCurrentDoctor(null)}
      onOpenChange={setOpen}
      options={options}
      onChange={selectUser}
      popupRender={(menu) => (
        <>
          <div style={{ padding: 8 }}>
            <Input
              placeholder="Search / add user"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleEnter}
              autoFocus
            />
          </div>
          {menu}
        </>
      )}
    />
  );
};

const LocaleSelect: React.FC = () => {
  const { locale, setLocale } = useContext(AppConfigContext);

  return (
    <Select<LocaleCode>
      value={locale}
      bordered={false}
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
