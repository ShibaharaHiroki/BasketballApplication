import { Flex, Text } from '@chakra-ui/react';

/** データが無いときに領域の中央へメッセージを出す */
const EmptyState = ({ message }) => (
  <Flex h="100%" minH="120px" align="center" justify="center">
    <Text color="gray.500" fontSize="sm" textAlign="center">
      {message}
    </Text>
  </Flex>
);

export default EmptyState;
