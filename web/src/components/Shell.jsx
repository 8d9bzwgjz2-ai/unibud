import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import useRetractableNav from '../lib/useRetractableNav';

export default function Shell() {
  const hidden = useRetractableNav();
  const { pathname } = useLocation();
  const insideThread = /^\/chat\/.+/.test(pathname);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] bg-paper">
      <Outlet />
      {!insideThread && <BottomNav hidden={hidden} />}
    </div>
  );
}
