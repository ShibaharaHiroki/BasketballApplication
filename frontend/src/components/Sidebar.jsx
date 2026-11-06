import { Divider, Heading } from '@chakra-ui/react';
import SidePanel from './common/SidePanel';
import DataFileSelector from './data/DataFileSelector';
import LoadSummary from './data/LoadSummary';

/** 左の操作パネル。部品を並べるだけにする */
const Sidebar = () => (
  <SidePanel side="left" width="240px">
    <Heading size="md" mb={4}>
      BasketballApplication
    </Heading>
    <Divider mb={4} />
    <DataFileSelector />
    <LoadSummary />
  </SidePanel>
);

export default Sidebar;
