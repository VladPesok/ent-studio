import React, { useState, useMemo, useRef, useEffect } from "react";
import { Select, Input } from "antd";

interface Props {
  value: string | null;
  items: string[];
  onChange(val: string | null): void;
  onCreate?(val: string): void;
  placeholder?: string;
  style?: object;
}

const CreatableSelect: React.FC<Props> = ({
  value,
  items,
  onChange,
  onCreate,
  placeholder = "Select / create…",
  style,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<any>(null);
  const setInputRef = (element: any) => {
    inputRef.current = element;
    if (element && open) {
      element.focus();
    }
  };

  const trimmed = search.trim();
  const lcItems = items.map((i) => i.toLowerCase());
  const showExtra = trimmed && !lcItems.includes(trimmed.toLowerCase());

  const filteredItems = useMemo(() => {
    if (!trimmed) return items;
    return items.filter(item => 
      item.toLowerCase().includes(trimmed.toLowerCase())
    );
  }, [items, trimmed]);

  const options = useMemo(
    () => [
      ...filteredItems.map((u) => ({ value: u, label: u })),
      ...(showExtra ? [{ value: trimmed, label: trimmed }] : []),
    ],
    [filteredItems, trimmed, showExtra],
  );

  const selectItem = (name: string | null | undefined) => {
    if (!name) return onChange(null);
    
    if (!items.includes(name)) {
      onCreate?.(name);
    }
    onChange(name);
  };

  return (
    <Select<string>
      value={value ?? undefined}
      placeholder={placeholder}
      style={style}
      open={open}
      showSearch={false}
      allowClear
      onClear={() => onChange(null)}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setSearch("");
        }
      }}
      options={options}
      onChange={selectItem}
      popupRender={(menu) => (
        <>
          <div style={{ padding: 8 }}>
            <Input
              ref={setInputRef}
              placeholder="Search / add…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {menu}
        </>
      )}
    />
  );
};

export default CreatableSelect;
