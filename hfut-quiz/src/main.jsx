import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Report from './Report.jsx'
import './index.css' // <--- 必须有这一行，否则 Tailwind 和样式不生效

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/report', element: <Report /> },
  { path: '/report.html', element: <Report /> },
  { path: '*', element: <div>Not Found</div> },
])



ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>,
)