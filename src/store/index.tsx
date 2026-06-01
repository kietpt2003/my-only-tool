import React from 'react';

import { RootStore, rootStore } from './RootStore';

// Tạo Context
const StoreContext = React.createContext<RootStore>(rootStore);

// Provider để bọc quanh App
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  );
};

// Custom Hook siêu mạnh mẽ để lấy store ra dùng ở bất kỳ Component nào
export const useStore = () => {
  const context = React.useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore phải được bọc bên trong StoreProvider');
  }
  return context;
};
