import React, { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';

interface SidePanelProps {
  side: 'left' | 'right';
  width?: string;
  children: ReactNode;
}

/** 左右のサイドパネルの枠。高さいっぱいに広がり、中でスクロールする */
const SidePanel: React.FC<SidePanelProps> = ({ side, width = '300px', children }) => (
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
