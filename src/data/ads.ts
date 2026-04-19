import type { Ad } from '@/types';
import car1 from '@/assets/ad-car-1.jpg';
import car2 from '@/assets/ad-car-2.jpg';
import villa from '@/assets/ad-villa-1.jpg';
import apt from '@/assets/ad-apartment-1.jpg';
import iphone from '@/assets/ad-iphone.jpg';
import sofa from '@/assets/ad-sofa.jpg';
import job from '@/assets/ad-job.jpg';

const days = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const ads: Ad[] = [
  {
    id: 'a1', user_id: 'u1', category_id: 'cars', city_id: 'riyadh',
    title: 'تويوتا لاند كروزر 2022 — فل كامل، ممشى قليل',
    slug: 'toyota-land-cruiser-2022',
    description: 'سيارة بحالة الوكالة، صيانة دورية في التوكيلات العالمية، ممشى ٤٥ ألف كم فقط. اللون أبيض لؤلؤي، الجلد بيج، شاشة كبيرة، كاميرا ٣٦٠، ٧ ركاب. السيارة خالية من الحوادث ولا تحتاج أي مصروف. السوم على السيعر.',
    price: 285000, currency: 'SAR', condition: 'like_new', status: 'published',
    is_featured: true, views_count: 1284, favorites_count: 47,
    images: [car1, car2],
    attributes: [
      { key: 'الموديل', value: '2022' }, { key: 'الممشى', value: '45,000 كم' },
      { key: 'ناقل الحركة', value: 'أوتوماتيك' }, { key: 'نوع الوقود', value: 'بنزين' },
    ],
    created_at: days(1),
  },
  {
    id: 'a2', user_id: 'u2', category_id: 'real-estate', city_id: 'jeddah',
    title: 'فيلا فاخرة للبيع في حي الشاطئ — ٦٠٠م²',
    slug: 'luxury-villa-jeddah-shati',
    description: 'فيلا حديثة البناء، تشطيب سوبر لوكس، ٧ غرف نوم ماستر، مجلس رجال ونساء، صالة طعام كبيرة، حوش أمامي وخلفي مع مسبح. قريبة من جميع الخدمات والشاطئ.',
    price: 4200000, currency: 'SAR', status: 'published',
    is_featured: true, views_count: 892, favorites_count: 63,
    images: [villa],
    attributes: [
      { key: 'المساحة', value: '600 م²' }, { key: 'غرف النوم', value: '7' },
      { key: 'الحمامات', value: '8' }, { key: 'عمر العقار', value: 'جديد' },
    ],
    created_at: days(2),
  },
  {
    id: 'a3', user_id: 'u4', category_id: 'real-estate', city_id: 'khobar',
    title: 'شقة للإيجار السنوي — ٣ غرف نوم، حي الراكة',
    slug: 'apartment-khobar-rakah',
    description: 'شقة جديدة في عمارة حديثة، ٣ غرف نوم، صالة كبيرة، مطبخ راكب، ٢ حمام، مكيفات سبليت. الموقع ممتاز قريب من الكورنيش والمولات.',
    price: 38000, currency: 'SAR', status: 'published',
    is_featured: false, views_count: 421, favorites_count: 18,
    images: [apt],
    attributes: [
      { key: 'المساحة', value: '140 م²' }, { key: 'غرف النوم', value: '3' },
      { key: 'الدور', value: 'الثاني' },
    ],
    created_at: days(3),
  },
  {
    id: 'a4', user_id: 'u3', category_id: 'electronics', city_id: 'dammam',
    title: 'آيفون 15 برو ماكس — ٢٥٦ جيجا، استخدام أسبوع',
    slug: 'iphone-15-pro-max',
    description: 'الجهاز جديد تقريبًا، اشتريته من الجرير قبل أسبوع، الفاتورة موجودة، الكرتون والملحقات كاملة. اللون تيتانيوم طبيعي.',
    price: 4800, currency: 'SAR', condition: 'like_new', status: 'published',
    is_featured: false, views_count: 612, favorites_count: 24,
    images: [iphone],
    attributes: [{ key: 'السعة', value: '256 GB' }, { key: 'الضمان', value: 'ساري' }],
    created_at: days(4),
  },
  {
    id: 'a5', user_id: 'u5', category_id: 'furniture', city_id: 'madinah',
    title: 'كنب مودرن ٧ مقاعد — لون بيج فاتح',
    slug: 'modern-sofa-7-seats',
    description: 'كنب جديد لم يستخدم، اشتريته قبل شهر ولم يناسب الصالة. القماش فاخر سهل التنظيف. السعر قابل للتفاوض البسيط.',
    price: 3200, currency: 'SAR', condition: 'new', status: 'published',
    is_featured: true, views_count: 287, favorites_count: 9,
    images: [sofa],
    attributes: [{ key: 'عدد المقاعد', value: '7' }, { key: 'اللون', value: 'بيج' }],
    created_at: days(5),
  },
  {
    id: 'a6', user_id: 'u2', category_id: 'jobs', city_id: 'jeddah',
    title: 'مطلوب مصمم جرافيك — دوام كامل، خبرة سنتين',
    slug: 'graphic-designer-jeddah',
    description: 'شركة تسويق رقمي بجدة تطلب مصمم جرافيك متمكن في Adobe Suite + Figma. راتب مغري + تأمين طبي + بدلات. الدوام من الأحد إلى الخميس.',
    price: 8000, currency: 'SAR', status: 'published',
    is_featured: false, views_count: 1102, favorites_count: 31,
    images: [job],
    attributes: [
      { key: 'نوع الدوام', value: 'كامل' }, { key: 'الخبرة', value: 'سنتان' },
    ],
    created_at: days(6),
  },
  {
    id: 'a7', user_id: 'u6', category_id: 'cars', city_id: 'taif',
    title: 'مرسيدس G-Class 2021 — أسود فل أوبشن',
    slug: 'mercedes-g-class-2021',
    description: 'سيارة وحش، حالتها ممتازة جدًا، صيانة منتظمة في الوكالة. الفئة AMG، فتحة سقف بانورامية، نظام صوت Burmester.',
    price: 720000, currency: 'SAR', condition: 'like_new', status: 'published',
    is_featured: true, views_count: 2014, favorites_count: 92,
    images: [car2, car1],
    attributes: [
      { key: 'الموديل', value: '2021' }, { key: 'الممشى', value: '32,000 كم' },
      { key: 'الفئة', value: 'AMG' },
    ],
    created_at: days(7),
  },
  {
    id: 'a8', user_id: 'u1', category_id: 'services', city_id: 'riyadh',
    title: 'خدمة نقل عفش داخل وخارج الرياض — فك وتركيب',
    slug: 'moving-service-riyadh',
    description: 'فريق محترف لنقل العفش، نوفر سيارات مجهزة وعمالة مدربة على الفك والتركيب والتغليف. أسعار تنافسية وخصومات للنقل خارج المدينة.',
    price: 800, currency: 'SAR', status: 'published',
    is_featured: false, views_count: 354, favorites_count: 7,
    images: [job],
    attributes: [{ key: 'يبدأ من', value: '800 ريال' }],
    created_at: days(9),
  },
];

export const adById = (id: string) => ads.find((a) => a.id === id);
export const adsByCategory = (categoryId: string) => ads.filter((a) => a.category_id === categoryId);
