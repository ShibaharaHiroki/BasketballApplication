import { useEffect } from 'react';
import { ChakraProvider, Flex } from '@chakra-ui/react';
import { AppProvider } from './context/AppContext';
import { useReloadDataFiles } from './hooks/useDataActions';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';

const AppContent = () => {
  const reloadDataFiles = useReloadDataFiles();

  // 起動時に、公開されている試合データの一覧を取得する
  useEffect(() => {
    reloadDataFiles();
  }, [reloadDataFiles]);

  return (
    <Flex h="100vh" overflow="hidden">
      <Sidebar />
      <MainPanel />
    </Flex>
  );
};

// ログインはサーバーの Basic 認証で行う（DEPLOY.md）
const App = () => (
  <ChakraProvider>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </ChakraProvider>
);

export default App;
