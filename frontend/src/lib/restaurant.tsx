import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { api } from './api';

export interface RestaurantContact {
  email: string;
  phone: string;
  address: string;
}

export interface RestaurantInfo {
  name: string;
  tagline: string;
  establishedYear: number;
  contact: RestaurantContact;
}

const DEFAULT_RESTAURANT: RestaurantInfo = {
  name: 'Vellichor',
  tagline: 'A quieter way to reserve a table',
  establishedYear: 2026,
  contact: {
    email: 'hello@vellichor.com',
    phone: '+1 (555) 019-9283',
    address: '142 Quiet Street, Cinematic City',
  },
};

const RestaurantContext = createContext<RestaurantInfo>(DEFAULT_RESTAURANT);

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<RestaurantInfo>(DEFAULT_RESTAURANT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<RestaurantInfo>('/restaurant');
        if (!cancelled && res.data && res.data.name) {
          setInfo(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch restaurant details from backend, using defaults:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => info, [info]);

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}

export function useRestaurant() {
  return useContext(RestaurantContext);
}
