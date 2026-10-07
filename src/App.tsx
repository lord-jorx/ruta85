import { Navigate, RouterProvider, createHashRouter } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import type { RouteHandle } from './components/AppShell'
import { ToastProvider } from './components/Toast'
import { Body } from './screens/Body'
import { Diet } from './screens/Diet'
import { Guide } from './screens/Guide'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { RoutineDetail, Training } from './screens/Training'

const ROUTINE_TITLES: Record<string, string> = {
  A: 'Rutina A',
  B: 'Rutina B',
  C: 'Rutina C',
  H1: 'Casa 1',
  H2: 'Casa 2',
  Z2: 'Cardio',
  DL: 'Deload',
}

const h = (handle: RouteHandle) => handle

// Router en modo hash: funciona en GitHub Pages sin reescrituras en el servidor.
const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Today />, handle: h({ title: 'Hoy' }) },
      { path: 'entreno', element: <Training />, handle: h({ title: 'Entreno' }) },
      {
        path: 'entreno/:code',
        element: <RoutineDetail />,
        handle: h({
          title: (p) => ROUTINE_TITLES[(p.code ?? '').toUpperCase()] ?? 'Rutina',
          back: '/entreno',
          kicker: 'Entreno',
        }),
      },
      { path: 'cuerpo', element: <Body />, handle: h({ title: 'Cuerpo' }) },
      { path: 'dieta', element: <Diet />, handle: h({ title: 'Dieta' }) },
      { path: 'guia', element: <Guide />, handle: h({ title: 'Guía' }) },
      { path: 'ajustes', element: <Settings />, handle: h({ title: 'Ajustes' }) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
