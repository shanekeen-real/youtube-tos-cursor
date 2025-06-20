"use client";
import React, { useState } from 'react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg mb-2 bg-white">
      <button
        className="w-full flex justify-between items-center px-4 py-3 font-medium text-left focus:outline-none"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-4 text-sm text-gray-700">{children}</div>}
    </div>
  );
} 