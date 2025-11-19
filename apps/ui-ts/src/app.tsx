import React from 'react';
import { HashRouter, Route, Link, Routes } from 'react-router-dom'
import { createRoot } from 'react-dom/client';

import Nav from './components/Nav'
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/Tasks';
import { TodoProvider } from './state/todoContext';
import { TimerProvider } from './state/timerContext';

const root = createRoot(document.body);
root.render(
  <HashRouter>
    <TodoProvider><TimerProvider>
        <div className='font-sans h-screen w-screen flex flex-col overflow-hidden bg-zinc-50'>
          <Nav/>
          <main className='flex-1 min-h-0 overflow-hidden'>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<TasksPage />} />
            </Routes>
          </main>
        </div>
      </TimerProvider></TodoProvider>
  </HashRouter>
);