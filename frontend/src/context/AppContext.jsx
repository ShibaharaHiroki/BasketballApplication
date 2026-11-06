import { createContext, useContext, useState } from 'react';

export const EVENTS_PAGE_SIZE = 100;

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
  const [dataFiles, setDataFiles] = useState([]);
  const [selectedFileNames, setSelectedFileNames] = useState([]);
  const [loadSummary, setLoadSummary] = useState(null);
  const [eventFilter, setEventFilter] = useState({});
  const [eventsOffset, setEventsOffset] = useState(0);
  const [eventsPage, setEventsPage] = useState(null);
  const [activeView, setActiveView] = useState('shotChart');
  const [shotChart, setShotChart] = useState(null);
  const [showZoneLabels, setShowZoneLabels] = useState(false);
  const [boxScore, setBoxScore] = useState(null);
  const [contribution, setContribution] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <AppContext.Provider
      value={{
        dataFiles,
        setDataFiles,
        selectedFileNames,
        setSelectedFileNames,
        loadSummary,
        setLoadSummary,
        eventFilter,
        setEventFilter,
        eventsOffset,
        setEventsOffset,
        eventsPage,
        setEventsPage,
        activeView,
        setActiveView,
        shotChart,
        setShotChart,
        showZoneLabels,
        setShowZoneLabels,
        boxScore,
        setBoxScore,
        contribution,
        setContribution,
        isLoading,
        setIsLoading,
        error,
        setError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext は AppProvider の内側で使ってください');
  }
  return ctx;
};
