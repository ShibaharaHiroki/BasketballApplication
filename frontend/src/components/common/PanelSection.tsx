import React, { ReactNode } from 'react';
import { Box, Divider, Heading, HStack } from '@chakra-ui/react';

interface PanelSectionProps {
  title: string;
  /** 見出しの右側に置くボタンなど */
  actions?: ReactNode;
  /** 下に区切り線を引くか */
  divider?: boolean;
  children: ReactNode;
}

/** 見出し付きのセクション。サイドパネルの中身をそろった見た目で並べるのに使う */
const PanelSection: React.FC<PanelSectionProps> = ({ title, actions, divider = false, children }) => (
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
