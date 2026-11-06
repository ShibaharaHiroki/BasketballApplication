import { Box } from '@chakra-ui/react';

/** 左右のサイドパネルの枠。高さいっぱいに広がり、中でスクロールする */
const SidePanel = ({ side, width = '300px', children }) => (
  <Box
    w={width}
    minW={width}
    h="100%"
    overflowY="auto"
    bg="gray.50"
    {...(side === 'left' ? { borderRightWidth: '1px' } : { borderLeftWidth: '1px' })}
    borderColor="gray.200"
    p={4}
  >
    {children}
  </Box>
);

export default SidePanel;
