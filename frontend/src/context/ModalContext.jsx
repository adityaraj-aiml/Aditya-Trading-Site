import { createContext, useCallback, useContext, useState } from "react";

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [afterAuth, setAfterAuth] = useState(null); // callback after successful auth

  // Stable identity: pages list openAuth in effect deps, so a new function per render would re-fire them forever.
  const openAuth = useCallback((mode = "login", cb = null) => {
    setAuthMode(mode);
    setAfterAuth(() => cb);
    setAuthOpen(true);
  }, []);

  return (
    <ModalContext.Provider
      value={{ authOpen, setAuthOpen, authMode, setAuthMode, openAuth, afterAuth, setAfterAuth }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
