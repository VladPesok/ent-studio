import React, { useState } from "react";
import "./AddCardModal.css";

interface Props {
  /** base folder like "Байрак_Андрій_1986-12-24", visitDate is passed separately */
  onOk:    (folderBase: string, visitDate: string) => void;
  onClose: () => void;
}

const AddCardModal: React.FC<Props> = ({ onOk, onClose }) => {
  const [surname,    setSurname]    = useState("");
  const [name,       setName]       = useState("");
  const [dob,        setDob]        = useState("");             // YYYY‑MM‑DD
  const [visitDate,  setVisitDate]  = useState("");             // YYYY‑MM‑DD

  const validDate  = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  const ready =
    surname.trim() &&
    name.trim()    &&
    validDate(dob) &&
    validDate(visitDate);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Нова картка пацієнта</h3>

        <label>Прізвище</label>
        <input
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          placeholder="Байрак"
        />

        <label>Ім’я</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Андрій"
        />

        <label>Дата народження (YYYY‑MM‑DD)</label>
        <input
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          placeholder="1986-12-24"
        />

        <label>Дата прийому (YYYY‑MM‑DD) *</label>
        <input
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          placeholder="2025-06-02"
        />

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Скасувати
          </button>
          <button
            className="btn primary"
            disabled={!ready}
            onClick={() =>
              onOk(`${surname}_${name}_${dob}`, visitDate)
            }
          >
            Створити
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCardModal;
