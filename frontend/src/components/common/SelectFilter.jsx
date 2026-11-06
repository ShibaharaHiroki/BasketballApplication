import { Select } from '@chakra-ui/react';

/** 「すべて」か 1 つを選ぶドロップダウン。値は文字列でも数値でもよい */
function SelectFilter({ placeholder, options, value, onChange, width = 'auto' }) {
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
