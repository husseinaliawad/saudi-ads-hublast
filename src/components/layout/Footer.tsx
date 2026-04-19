import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="container-app py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-display font-extrabold text-lg">س</div>
            <span className="font-display text-xl font-extrabold">سوق</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            منصة الإعلانات المبوبة الأولى في المملكة العربية السعودية. بيع، اشترِ، وتواصل بأمان.
          </p>
        </div>

        <div>
          <h4 className="font-display font-bold mb-3">الأقسام</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/browse?cat=cars" className="hover:text-primary">سيارات</Link></li>
            <li><Link to="/browse?cat=real-estate" className="hover:text-primary">عقارات</Link></li>
            <li><Link to="/browse?cat=jobs" className="hover:text-primary">وظائف</Link></li>
            <li><Link to="/browse?cat=services" className="hover:text-primary">خدمات</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-bold mb-3">المنصة</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/post-ad" className="hover:text-primary">أضف إعلان</Link></li>
            <li><a href="#" className="hover:text-primary">كيف نعمل</a></li>
            <li><a href="#" className="hover:text-primary">نصائح الأمان</a></li>
            <li><a href="#" className="hover:text-primary">المساعدة</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-bold mb-3">قانوني</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary">الشروط والأحكام</a></li>
            <li><a href="#" className="hover:text-primary">سياسة الخصوصية</a></li>
            <li><a href="#" className="hover:text-primary">اتصل بنا</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-app py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} سوق — جميع الحقوق محفوظة. صُمم بحب في المملكة 🇸🇦
        </div>
      </div>
    </footer>
  );
}
