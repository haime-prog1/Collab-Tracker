import type { ComponentType } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import Dashboard from '@/pages/Dashboard';
import Pipeline from '@/pages/Pipeline';

// Secondary screens are split into their own chunks. They're still precached by the
// service worker, so they load instantly — and offline — after the first visit.
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'pipeline', element: <Pipeline /> },
      { path: 'brands', lazy: page(() => import('@/pages/Brands')) },
      { path: 'brands/:id', lazy: page(() => import('@/pages/BrandDetail')) },
      { path: 'finance', lazy: page(() => import('@/pages/Finance')) },
      { path: 'settings', lazy: page(() => import('@/pages/Settings')) },
      { path: '*', lazy: page(() => import('@/pages/NotFound')) },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
