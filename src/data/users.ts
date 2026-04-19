import type { User } from '@/types';

export const users: User[] = [
  { id: 'u1', full_name: 'عبدالله الحربي',   city_id: 'riyadh', rating_avg: 4.8, rating_count: 42, is_verified: true,  created_at: '2024-02-10T09:00:00Z' },
  { id: 'u2', full_name: 'فاطمة الزهراني',  city_id: 'jeddah', rating_avg: 4.9, rating_count: 67, is_verified: true,  created_at: '2023-11-04T11:00:00Z' },
  { id: 'u3', full_name: 'خالد العتيبي',     city_id: 'dammam', rating_avg: 4.5, rating_count: 19, is_verified: false, created_at: '2024-05-21T14:30:00Z' },
  { id: 'u4', full_name: 'نورة القحطاني',    city_id: 'khobar', rating_avg: 5.0, rating_count: 12, is_verified: true,  created_at: '2024-08-12T08:15:00Z' },
  { id: 'u5', full_name: 'محمد الشمري',      city_id: 'madinah', rating_avg: 4.3, rating_count: 27, is_verified: false, created_at: '2024-01-30T16:00:00Z' },
  { id: 'u6', full_name: 'سارة الدوسري',     city_id: 'taif',   rating_avg: 4.7, rating_count: 31, is_verified: true,  created_at: '2024-03-18T10:00:00Z' },
];

export const userById = (id: string) => users.find((u) => u.id === id);
