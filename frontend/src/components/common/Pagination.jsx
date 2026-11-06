import { Button, HStack, Text } from '@chakra-ui/react';

/** 「1–100 / 405 件」と前へ・次へボタン */
const Pagination = ({ offset, limit, total, onChange }) => {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <HStack spacing={2}>
      <Text fontSize="sm" color="gray.600">
        {from}–{to} / {total} 件
      </Text>
      <Button size="sm" isDisabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
        前へ
      </Button>
      <Button size="sm" isDisabled={to >= total} onClick={() => onChange(offset + limit)}>
        次へ
      </Button>
    </HStack>
  );
};

export default Pagination;
