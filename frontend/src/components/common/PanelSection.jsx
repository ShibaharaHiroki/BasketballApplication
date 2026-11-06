import { Box, Divider, Heading, HStack } from '@chakra-ui/react';

/** 見出し付きのセクション。サイドパネルの中身をそろった見た目で並べるのに使う */
const PanelSection = ({ title, actions, divider = false, children }) => (
  <Box mb={4}>
    <HStack justify="space-between" mb={2}>
      <Heading size="sm">{title}</Heading>
      {actions}
    </HStack>
    {children}
    {divider && <Divider mt={4} />}
  </Box>
);

export default PanelSection;
