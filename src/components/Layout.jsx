import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header/Headerbar';
import CasaGate from './CasaGate';
import { SITE_PASSWORD_ENABLED } from '../config/sitePassword';

// Login is the one route that must stay reachable while locked - it's how
// someone with a real account (but an unrecognized browser/device) gets
// in without needing to know the site password at all.
const ALWAYS_UNLOCKED_ROUTES = ['/login'];

const isAlreadyUnlocked = () => {
  if (!SITE_PASSWORD_ENABLED) return true;
  const hasAccount = !!localStorage.getItem('auth');
  const pageUnlocked = localStorage.getItem('pageUnlocked') === 'true';
  return hasAccount || pageUnlocked;
};

const Layout = ({ children }) => {
  const location = useLocation();
  // Computed synchronously (not via useEffect) so an already-unlocked
  // returning Gamler never sees a flash of the gate before this settles.
  const [unlocked, setUnlocked] = useState(isAlreadyUnlocked);

  const showGate = SITE_PASSWORD_ENABLED && !unlocked && !ALWAYS_UNLOCKED_ROUTES.includes(location.pathname);

  return (
    <div>
      <Header locked={showGate} />
      <main className='my-3'>
        {showGate ? <CasaGate onUnlock={() => setUnlocked(true)} /> : children}
      </main>
    </div>
  );
};

export default Layout;
