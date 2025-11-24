import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Users, BookOpen, Camera } from "lucide-react";
import { APP_TITLE } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {APP_TITLE}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            نظام متكامل لتسجيل حضور الطلاب باستخدام تقنية QR Code
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle>للمعلمين</CardTitle>
              <CardDescription>
                إنشاء جلسات حضور وإدارتها بسهولة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• إنشاء جلسات غير محدودة</li>
                <li>• توليد رموز QR تلقائياً</li>
                <li>• متابعة الحضور مباشرة</li>
                <li>• تصدير السجلات إلى Excel</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <QrCode className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle>سهولة الاستخدام</CardTitle>
              <CardDescription>
                تسجيل حضور سريع وآمن
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• مسح رمز QR فقط</li>
                <li>• إدخال الاسم</li>
                <li>• تأكيد فوري</li>
                <li>• بدون تسجيل مسبق</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle>إدارة متقدمة</CardTitle>
              <CardDescription>
                تحكم كامل في الجلسات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• فتح وإغلاق الجلسات</li>
                <li>• عرض قوائم الحضور</li>
                <li>• إحصائيات مفصلة</li>
                <li>• منع التكرار</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">ابدأ الآن</CardTitle>
              <CardDescription>
                اختر الخيار المناسب لك
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => setLocation("/teacher-login")}
                className="gap-2"
              >
                <BookOpen className="w-5 h-5" />
                تسجيل دخول المعلم
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/checkin")}
                className="gap-2"
              >
                <Camera className="w-5 h-5" />
                تسجيل حضور طالب
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur mt-16">
        <div className="container py-6 text-center text-gray-600">
          <p>© 2025 {APP_TITLE} - جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
