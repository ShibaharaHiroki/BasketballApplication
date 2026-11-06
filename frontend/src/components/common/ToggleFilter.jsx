import { FormControl, FormLabel, Switch } from '@chakra-ui/react';

/** ラベル付きのオン/オフスイッチ */
const ToggleFilter = ({ id, label, isChecked, onChange }) => (
  <FormControl display="flex" alignItems="center" w="auto">
    <Switch id={id} size="sm" isChecked={isChecked} onChange={(e) => onChange(e.target.checked)} />
    <FormLabel htmlFor={id} mb={0} ml={2} fontSize="sm" whiteSpace="nowrap">
      {label}
    </FormLabel>
  </FormControl>
);

export default ToggleFilter;
