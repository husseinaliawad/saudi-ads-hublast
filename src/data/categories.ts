import type { Category } from '@/types';

export const categories: Category[] = [
  { id: 'cars',         name_ar: 'سيارات',          slug: 'cars',         icon: 'Car',          sort_order: 1 },
  { id: 'real-estate',  name_ar: 'عقارات',          slug: 'real-estate',  icon: 'Building2',    sort_order: 2 },
  { id: 'jobs',         name_ar: 'وظائف',           slug: 'jobs',         icon: 'Briefcase',    sort_order: 3 },
  { id: 'services',     name_ar: 'خدمات',           slug: 'services',     icon: 'Wrench',       sort_order: 4 },
  { id: 'electronics',  name_ar: 'إلكترونيات',      slug: 'electronics',  icon: 'Smartphone',   sort_order: 5 },
  { id: 'furniture',    name_ar: 'أثاث',            slug: 'furniture',    icon: 'Sofa',         sort_order: 6 },
  { id: 'appliances',   name_ar: 'أجهزة منزلية',     slug: 'appliances',   icon: 'WashingMachine', sort_order: 7 },
  { id: 'pets',         name_ar: 'حيوانات',         slug: 'pets',         icon: 'PawPrint',     sort_order: 8 },
  { id: 'personal',     name_ar: 'مستلزمات شخصية',   slug: 'personal',     icon: 'Shirt',        sort_order: 9 },
  { id: 'contracting',  name_ar: 'مقاولات',         slug: 'contracting',  icon: 'HardHat',      sort_order: 10 },
  { id: 'transport',    name_ar: 'نقل وشحن',        slug: 'transport',    icon: 'Truck',        sort_order: 11 },
  { id: 'education',    name_ar: 'تعليم وتدريب',     slug: 'education',    icon: 'GraduationCap',sort_order: 12 },
];

export const categoryById = (id: string) => categories.find((c) => c.id === id);
export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
