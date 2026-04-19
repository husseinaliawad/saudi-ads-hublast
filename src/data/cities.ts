import type { City } from '@/types';

export const cities: City[] = [
  { id: 'riyadh', name_ar: 'الرياض', region: 'الوسطى' },
  { id: 'jeddah', name_ar: 'جدة', region: 'الغربية' },
  { id: 'makkah', name_ar: 'مكة المكرمة', region: 'الغربية' },
  { id: 'madinah', name_ar: 'المدينة المنورة', region: 'الغربية' },
  { id: 'dammam', name_ar: 'الدمام', region: 'الشرقية' },
  { id: 'khobar', name_ar: 'الخبر', region: 'الشرقية' },
  { id: 'dhahran', name_ar: 'الظهران', region: 'الشرقية' },
  { id: 'taif', name_ar: 'الطائف', region: 'الغربية' },
  { id: 'abha', name_ar: 'أبها', region: 'الجنوبية' },
  { id: 'tabuk', name_ar: 'تبوك', region: 'الشمالية' },
  { id: 'buraidah', name_ar: 'بريدة', region: 'الوسطى' },
  { id: 'hail', name_ar: 'حائل', region: 'الشمالية' },
  { id: 'jazan', name_ar: 'جازان', region: 'الجنوبية' },
  { id: 'najran', name_ar: 'نجران', region: 'الجنوبية' },
  { id: 'yanbu', name_ar: 'ينبع', region: 'الغربية' },
  { id: 'jubail', name_ar: 'الجبيل', region: 'الشرقية' },
  { id: 'ahsa', name_ar: 'الأحساء', region: 'الشرقية' },
  { id: 'qatif', name_ar: 'القطيف', region: 'الشرقية' },
  { id: 'khamis', name_ar: 'خميس مشيط', region: 'الجنوبية' },
];

export const cityById = (id: string) => cities.find((c) => c.id === id);
