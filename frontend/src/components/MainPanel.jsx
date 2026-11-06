import { Box, Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { useAppContext } from '../context/AppContext';
import BoxScoreView from './boxscore/BoxScoreView';
import ContributionView from './contribution/ContributionView';
import DataExplorer from './data/DataExplorer';
import EventFilterBar from './data/EventFilterBar';
import ShotChart from './shot/ShotChart';

const VIEWS = [
  { key: 'shotChart', label: 'シュートチャート', render: () => <ShotChart /> },
  { key: 'boxScore', label: 'ボックススコア', render: () => <BoxScoreView /> },
  { key: 'contribution', label: '貢献度', render: () => <ContributionView /> },
  { key: 'events', label: 'プレイバイプレイ', render: () => <DataExplorer /> },
];

/** 中央のメイン表示領域。上に共通の絞り込みバー、下にタブで画面を切り替える */
const MainPanel = () => {
  const { activeView, setActiveView } = useAppContext();
  const index = Math.max(0, VIEWS.findIndex((v) => v.key === activeView));

  return (
    <Flex flex="1" h="100%" direction="column" overflow="hidden" p={4} minW={0}>
      <Box mb={3}>
        <EventFilterBar />
      </Box>
      <Tabs
        index={index}
        onChange={(i) => setActiveView(VIEWS[i].key)}
        isLazy
        display="flex"
        flexDirection="column"
        flex="1"
        minH={0}
      >
        <TabList>
          {VIEWS.map((v) => (
            <Tab key={v.key} fontSize="sm">
              {v.label}
            </Tab>
          ))}
        </TabList>
        <TabPanels flex="1" minH={0}>
          {VIEWS.map((v) => (
            <TabPanel key={v.key} h="100%" px={0} pb={0}>
              {v.render()}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Flex>
  );
};

export default MainPanel;
