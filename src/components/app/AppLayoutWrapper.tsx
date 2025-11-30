import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';

export const AppLayoutWrapper = () => {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};
