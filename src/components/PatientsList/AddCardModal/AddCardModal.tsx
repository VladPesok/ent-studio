import React from "react";
import { Modal, Form, Input, DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/uk";
dayjs.locale("uk");

interface Props {
  onOk(folderBase: string, visitDate: string): void;
  onClose(): void;
}

type FormValues = {
  surname: string;
  name: string;
  dob: Dayjs;
  visitDate: Dayjs;
};

const AddCardModal: React.FC<Props> = ({ onOk, onClose }) => {
  const [form] = Form.useForm<FormValues>();

  const fmt = (d: Dayjs) => d.format("DD-MM-YYYY");

  const handleOk = async () => {
    try {
      const v = await form.validateFields();
      const folderBase = `${v.surname.trim()}_${v.name.trim()}_${fmt(v.dob)}`;
      onOk(folderBase, fmt(v.visitDate));
    } catch {
    }
  };

  return (
    <Modal
      open
      title="Нова картка пацієнта"
      okText="Створити"
      cancelText="Скасувати"
      onCancel={onClose}
      onOk={handleOk}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ visitDate: dayjs() }}
      >
        <Form.Item
          label="Прізвище"
          name="surname"
          rules={[{ required: true, message: "Вкажіть прізвище" }]}
        >
          <Input placeholder="Байрак" />
        </Form.Item>

        <Form.Item
          label="Ім’я"
          name="name"
          rules={[{ required: true, message: "Вкажіть ім’я" }]}
        >
          <Input placeholder="Андрій" />
        </Form.Item>

        <Form.Item
          label="Дата народження"
          name="dob"
          rules={[
            { required: true, message: "Вкажіть дату народження" },
            {
              validator: (_, value) =>
                value && value.isValid()
                  ? Promise.resolve()
                  : Promise.reject("Невірний формат дати"),
            },
          ]}
        >
          <DatePicker
            allowClear={false}
            format="DD-MM-YYYY"
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          label="Дата прийому"
          name="visitDate"
          rules={[
            { required: true, message: "Вкажіть дату прийому" },
            {
              validator: (_, value) =>
                value && value.isValid()
                  ? Promise.resolve()
                  : Promise.reject("Невірний формат дати"),
            },
          ]}
        >
          <DatePicker
            allowClear={false}
            format="DD-MM-YYYY"
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddCardModal;
