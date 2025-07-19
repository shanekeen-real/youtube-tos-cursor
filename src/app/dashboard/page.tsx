"use client";
import React, { Suspense } from 'react';
import DashboardClient from './DashboardClient';
import { TwoFactorWrapper } from '@/lib/imports';

export default function DashboardPage() {
  return (
    <TwoFactorWrapper>
    <Suspense fallback={<div className="text-center py-10">Loading dashboard...</div>}>
      <DashboardClient />
    </Suspense>
    </TwoFactorWrapper>
  );
} 