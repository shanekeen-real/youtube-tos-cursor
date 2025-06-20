"use client";
import React, { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading dashboard...</div>}>
      <DashboardClient />
    </Suspense>
  );
} 