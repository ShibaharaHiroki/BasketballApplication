import React from 'react';
import { FormControl, FormLabel, Switch } from '@chakra-ui/react';

interface ToggleFilterProps {
  id: string;
  label: string;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}

/** ラベル付きのオン/オフスイッチ */
const ToggleFilter: React.FC<ToggleFilterProps> = ({ id, label, isChecked, onChange }) => (
  <FormControl display="flex" alignItems="center" w="auto">
    <Switch id={id} size="sm" isChecked={isChecked} onChange={(e) => onChange(e.target.checked)} />
    <FormLabel htmlFor={id} mb={0} ml={2} fontSize="sm" whiteSpace="nowrap">
      {label}
    </FormLabel>
  </FormControl>
);

export default ToggleFilter;
