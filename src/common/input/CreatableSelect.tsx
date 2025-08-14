import React, { useState, useMemo, useRef, useEffect } from "react";
import { Select, Input } from "antd";

interface Props {
  /** Current value (or null when nothing is chosen) */
  value: string | null;
  /** Full list of existing items */
  items: string[];
  /** Called on every selection / clearing */
  onChange(val: string | null): void;
  /** Called when user submits a brand-new entry */
  onCreate?(val: string): void;
  /** Optional UI details */
  placeholder?: string;
  style?: object;
}

/**
 * Ant Design drop-in replacement for "select or create on-the-fly" patterns.
 */
const CreatableSelect: React.FC<Props> = ({
  value,
  items,
  onChange,
  onCreate,
  placeholder = "Select / create…",
  style,
}) => {
  /* popup / search state */
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Callback ref for immediate focus when input is rendered
  const inputRef = useRef<any>(null);
  const setInputRef = (element: any) => {
    inputRef.current = element;
    if (element && open) {
      element.focus();
    }
  };

  /* build option list (dedup, case-insensitive) */
  const trimmed = search.trim();
  const lcItems = items.map((i) => i.toLowerCase());
  const showExtra = trimmed && !lcItems.includes(trimmed.toLowerCase());

  // Filter existing items based on search input
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

  /* helpers */
  const selectItem = (name: string | null | undefined) => {
    if (!name) return onChange(null);
    if (!items.includes(name)) onCreate?.(name);
    onChange(name);
  };

  const handleEnter = () => {
    if (trimmed) {
      selectItem(trimmed);
      setSearch("");
      setOpen(false);
    }
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
              onPressEnter={handleEnter}
            />
          </div>
          {menu}
        </>
      )}
    />
  );
};

export default CreatableSelect;
