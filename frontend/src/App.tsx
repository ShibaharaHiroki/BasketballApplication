import React, { useEffect } from 'react';
import { ChakraProvider, Flex } from '@chakra-ui/react';
import { AppProvider } from './context/AppContext';
import { useReloadBackendInfo } from './hooks/useDataActions';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';

const AppContent: React.FC = () => {
  const reloadBackendInfo = useReloadBackendInfo();

  // 起動時にバックエンドの稼働確認と、入力フォルダのファイル一覧を取得する
  useEffect(() => {
    reloadBackendInfo();
  }, [reloadBackendInfo]);

  return (
    <Flex h="100vh" overflow="hidden">
      <Sidebar />
      <MainPanel />
    </Flex>
  );
};

const App: React.FC = () => (
  <ChakraProvider>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </ChakraProvider>
);

export default App;
