import React, { useMemo, useState, useEffect } from "react";
import { Table, Input, Button, Dropdown, Space, MenuProps } from "antd";
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

export const splitName = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};

const PatientsList: React.FC = () => {
  /* ---------------- local state ---------------- */
  const [patients, setPatients] = useState<patientsApi.Patient[]>([]);
  const [meta,     setMeta]     = useState<Record<string, { doctor?: string; diagnosis?: string }>>({});
  const [search,   setSearch]   = useState("");
  const [addOpen,  setAddOpen]  = useState(false);

  const nav = useNavigate();

  /* ---------------- initial / reload ------------ */
  const reloadPatients = async () => {
    const list = await patientsApi.getPatients();
    setPatients(list);

    /* grab lightweight metadata for each */
    const next: typeof meta = {};
    for (const p of list) {
      const cfg = await patientsApi.getPatientMeta(p.folder);
      next[p.folder] = { doctor: cfg?.doctor ?? "", diagnosis: cfg?.diagnosis ?? "" };
    }
    setMeta(next);
  };

  useEffect(() => { reloadPatients(); }, []);

  /* ---------------- filter + sort ---------------- */
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
      .map((p) => ({ key: p.folder, ...p })); // AntD needs key
  }, [patients, search]);

  /* ---------------- table columns ---------------- */
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
      width: 170,
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
            patientsApi.openPatientFolder(r.folder);
          }}
          style={{ cursor: "pointer", fontSize: 18 }}
        />
      ),
    },
  ];

  /* ---------------- dropdown actions ------------- */
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

  /* ---------------- add modal -------------------- */
  const handleAdd = async (folderBase: string, date: string) => {
    await patientsApi.makePatient(folderBase, date);
    setAddOpen(false);
    reloadPatients();
  };

  /* ---------------- render ----------------------- */
  if (!patients.length)
    return <p className="empty-msg">Поки немає доданих пацієнтів</p>;

  return (
    <>
      {addOpen && (
        <AddCardModal onClose={() => setAddOpen(false)} onOk={handleAdd} />
      )}

      <div className="project-view">
        <div className="title-row">
          <h2>Пацієнти</h2>

          <Input
            className="search-input"
            placeholder="Пошук за іменем/прізвищем…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />

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

        <Table
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: () => nav(`/patients/${record.folder}`),   // ← redirect
          })}
          rowClassName="patient-row"
        />
      </div>
    </>
  );
};

export default PatientsList;
