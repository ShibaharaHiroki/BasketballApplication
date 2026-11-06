import React from 'react';
import { Select } from '@chakra-ui/react';

export interface SelectOption<V extends string | number> {
  value: V;
  label: string;
}

interface SelectFilterProps<V extends string | number> {
  /** 何も選んでいないときの表示（例: 「すべてのチーム」） */
  placeholder: string;
  options: SelectOption<V>[];
  value: V | null | undefined;
  /** 未選択に戻したときは null */
  onChange: (value: V | null) => void;
  width?: string;
}

/** 「すべて」か 1 つを選ぶドロップダウン。値は文字列でも数値でもよい */
function SelectFilter<V extends string | number>({ placeholder, options, value, onChange, width = 'auto' }: SelectFilterProps<V>) {
  return (
    <Select
      size="sm"
      w={width}
      placeholder={placeholder}
      value={value == null ? '' : String(value)}
      onChange={(e) => {
        const selected = options.find((o) => String(o.value) === e.target.value);
        onChange(selected ? selected.value : null);
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export default SelectFilter;
