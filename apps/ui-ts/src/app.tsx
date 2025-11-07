import React from 'react';
import { createRoot } from 'react-dom/client';
import Nav from './components/Nav'
import Dashboard from './components/Dashboard';

const root = createRoot(document.body);
root.render(
<div className='font-sans h-dvh w-screen flex flex-col overflow-hidden'>
    <Nav />
    <Dashboard />

</div>
);