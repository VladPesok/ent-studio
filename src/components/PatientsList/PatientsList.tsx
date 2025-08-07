import React, { useMemo, useState, useEffect } from "react";
import { Table, Input, Button, Dropdown, theme as antTheme, MenuProps } from "antd";
import {
  EllipsisOutlined,
  PlusOutlined,
  UsbOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import AddCardModal from "./AddCardModal/AddCardModal";
import type { ColumnsType } from "antd/es/table";
import * as patientsApi from "../../helpers/patientsApi";
import "./PatientsList.css";

const { useToken } = antTheme;

export const splitName = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};

const PatientsList: React.FC = () => {
  const [patients, setPatients] = useState<patientsApi.Patient[]>([]);
  const [meta, setMeta] = useState<Record<string, { doctor?: string; diagnosis?: string }>>({});
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const nav = useNavigate();
  const { token } = useToken();

  const reloadPatients = async () => {
    const list = await patientsApi.getPatients();
    setPatients(list);

    const next: typeof meta = {};
    for (const p of list) {
      const cfg = await patientsApi.getPatientMainMeta(p.folder);
      next[p.folder] = { doctor: cfg?.doctor ?? "", diagnosis: cfg?.diagnosis ?? "" };
    }
    setMeta(next);
  };

  useEffect(() => {
    reloadPatients();
  }, []);

  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patients
      .filter((p) => {
        if (!term) return true;
        const { surname, name } = splitName(p.folder);
        return (
          surname.toLowerCase().includes(term) ||
          name.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((p) => ({ key: p.folder, ...p }));
  }, [patients, search]);
  const columns: ColumnsType<patientsApi.Patient & { key: string }> = [
    {
      title: "Прізвище та ім’я",
      dataIndex: "folder",
      key: "pn",
      render: (folder) => {
        const { surname, name } = splitName(folder);
        return <span className="patient-cell">{`${surname} ${name}`}</span>;
      },
      sorter: (a, b) =>
        splitName(a.folder).surname.localeCompare(splitName(b.folder).surname),
    },
    {
      title: "Дата народження",
      dataIndex: "folder",
      key: "dob",
      width: 150,
      render: (f) => splitName(f).dob,
    },
    {
      title: "Дата останнього прийому",
      dataIndex: "date",
      key: "visit",
      width: 230,
      sorter: (a, b) => (a.date > b.date ? -1 : 1),
    },
    {
      title: "Лікар",
      key: "doc",
      width: 160,
      render: (_, r) => meta[r.folder]?.doctor ?? "",
    },
    {
      title: "Діагноз",
      key: "diag",
      render: (_, r) => meta[r.folder]?.diagnosis ?? "",
    },
    {
      title: "Статус",
      key: "state",
      width: 100,
      render: () => <span className="state-pill">active</span>,
    },
    {
      title: "",
      key: "open",
      width: 50,
      render: (_, r) => (
        <FolderOpenOutlined
          onClick={(e) => {
            e.stopPropagation();
            patientsApi.openPatientFolderInFs(r.folder);
          }}
          style={{ cursor: "pointer", fontSize: 18 }}
        />
      ),
    },
  ];

  const items: MenuProps["items"] = [
    {
      key: "usb",
      icon: <UsbOutlined />,
      label: "Імпорт з USB",
      onClick: async () => {
        await patientsApi.scanUsb();
        reloadPatients();
      },
    },
  ];

  const handleAdd = async (folderBase: string, date: string) => {
    await patientsApi.makePatient(folderBase, date);
    setAddOpen(false);
    reloadPatients();
  };

  return (
    <>
      {addOpen && (
        <AddCardModal onClose={() => setAddOpen(false)} onOk={handleAdd} />
      )}

      <div className="project-view">
        <div style={{
              margin: 24,
              padding: 24,
              background: token.colorBgContainer,
            }}>
          <div className="title-row">
            <div className="title-left">
              <h2>Пацієнти</h2>
              <Input
                className="search-input"
                placeholder="Пошук за іменем/прізвищем…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </div>
            
            <div className="title-right">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}
              >
                Додати картку
              </Button>

              <Dropdown menu={{ items }} trigger={["click"]}>
                <Button icon={<EllipsisOutlined />} />
              </Dropdown>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onClick: () => nav(`/patients/${record.folder}`),
            })}
            rowClassName="patient-row"
            locale={{
              emptyText: "Поки немає доданих пацієнтів"
            }}
          />
        </div>
      </div>
    </>
  );
};

export default PatientsList;
