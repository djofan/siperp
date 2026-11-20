'use client';
import { createContext, useContext } from 'react';
import type { Viewer } from '@/contracts/modules/rapat';
export const ViewerContext = createContext<Viewer | null>(null);
export function useViewer() { const viewer = useContext(ViewerContext); if (!viewer) throw new Error('Akses Rapat belum tersedia'); return viewer; }
