import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle, QrCode, Camera, X, Keyboard, MapPin } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export default function StudentCheckIn() {
  const [, params] = useRoute("/checkin/:code");
  const sessionCode = params?.code || "";

  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [studentLocation, setStudentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const { data: sessionInfo, isLoading: verifyLoading } = trpc.attendance.verifySession.useQuery(
    { sessionCode },
    { enabled: !!sessionCode }
  );

  const checkInMutation = trpc.attendance.checkIn.useMutation({
    onSuccess: (data) => {
      setIsSuccess(true);
      setSessionTitle(data.sessionTitle);
      // Set flag in localStorage to prevent re-registration from this device
      if (sessionInfo?.sessionId) {
        localStorage.setItem(`attendance_registered_${sessionInfo.sessionId}`, 'true');
      }
      toast.success("تم تسجيل حضورك بنجاح!");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تسجيل الحضور");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for device restriction
    if (sessionInfo?.sessionId) {
      const isRegistered = localStorage.getItem(`attendance_registered_${sessionInfo.sessionId}`);
      if (isRegistered) {
        toast.error("عذراً، تم تسجيل الحضور مسبقاً من هذا الجهاز لهذه الجلسة.");
        return;
      }
    }

    if (!studentName.trim()) {
      toast.error("يرجى إدخال اسمك");
      return;
    }
    if (!studentId.trim()) {
      toast.error("يرجى إدخال الرقم الجامعي");
      return;
    }

    // Check if session requires location
    // @ts-ignore - property added in backend
    if (sessionInfo?.requireLocation) {
      setIsGettingLocation(true);
      if (navigator.geolocation) {
        toast.info("جاري التحقق من الموقع...");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setIsGettingLocation(false);
            setStudentLocation({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
            checkInMutation.mutate({
              sessionCode,
              studentName,
              studentId,
              studentEmail: studentEmail || undefined,
              studentLatitude: position.coords.latitude,
              studentLongitude: position.coords.longitude,
            });
          },
          (error) => {
            setIsGettingLocation(false);
            console.warn("Location error:", error);
            toast.error("يجب السماح بالوصول للموقع لتسجيل الحضور في هذه الجلسة");
          }
        );
      } else {
        setIsGettingLocation(false);
        toast.error("المتصفح لا يدعم تحديد الموقع");
      }
    } else {
      // Session does not require location
      checkInMutation.mutate({
        sessionCode,
        studentName,
        studentId,
        studentEmail: studentEmail || undefined,
      });
    }
  };

  const verifyPinMutation = trpc.attendance.verifyByPin.useQuery(
    { pin: pinInput },
    { enabled: false }
  );

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 6) {
      toast.error("يرجى إدخال رقم مكون من 6 أرقام");
      return;
    }

    setIsPinVerifying(true);
    try {
      const result = await verifyPinMutation.refetch();
      if (result.data?.valid && result.data.sessionCode) {
        window.location.href = `/checkin/${result.data.sessionCode}`;
      } else {
        toast.error(result.data?.message || "رقم PIN غير صحيح");
      }
    } finally {
      setIsPinVerifying(false);
    }
  };

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      setShowScanner(true);

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const sessionCodeMatch = decodedText.match(/\/checkin\/([a-f0-9]+)$/);
          if (sessionCodeMatch) {
            window.location.href = `/checkin/${sessionCodeMatch[1]}`;
          }
        },
        () => { }
      );
    } catch (err) {
      toast.error("فشل فتح الكاميرا");
      setShowScanner(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setShowScanner(false);
  };

  // شاشة الترحيب عندما لا يكون هناك sessionCode
  if (!sessionCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">تسجيل الحضور</CardTitle>
            <CardDescription className="text-lg">
              اختر طريقة تسجيل الحضور
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pin" className="text-xs">
                  <Keyboard className="w-4 h-4 ml-1" />
                  PIN
                </TabsTrigger>
                <TabsTrigger value="qr" className="text-xs">
                  <QrCode className="w-4 h-4 ml-1" />
                  QR
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pin" className="space-y-4 mt-4">
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin">رقم PIN (6 أرقام)</Label>
                    <Input
                      id="pin"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      disabled={isPinVerifying}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isPinVerifying || pinInput.length !== 6}
                  >
                    {isPinVerifying && (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    )}
                    متابعة
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="qr" className="space-y-4 mt-4">
                {!showScanner ? (
                  <Button onClick={startScanner} className="w-full" size="lg">
                    <Camera className="w-5 h-5 ml-2" />
                    فتح الكاميرا
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
                    <Button onClick={stopScanner} variant="outline" className="w-full">
                      <X className="w-4 h-4 ml-2" />
                      إغلاق الكاميرا
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verifyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">خطأ</CardTitle>
            <CardDescription>{sessionInfo?.message || "الجلسة غير صالحة"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/checkin"} className="w-full">
              العودة للمسح
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">تم تسجيل حضورك!</CardTitle>
            <CardDescription className="text-lg">
              {sessionTitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-700">
              شكراً لك، <strong>{studentName}</strong>
            </p>
            <p className="text-sm text-gray-600">
              تم تسجيل حضورك بنجاح في هذه الجلسة
            </p>
            {studentLocation && (
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                تم التحقق من موقعك
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">تسجيل الحضور</CardTitle>
          <CardDescription className="text-lg">
            {sessionInfo.sessionTitle}
          </CardDescription>
          {sessionInfo.sessionDescription && (
            <p className="text-sm text-gray-600 mt-2">
              {sessionInfo.sessionDescription}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="form" className="text-xs">
                <Keyboard className="w-4 h-4 ml-1" />
                نموذج
              </TabsTrigger>
              <TabsTrigger value="pin" className="text-xs">
                <Keyboard className="w-4 h-4 ml-1" />
                PIN
              </TabsTrigger>
              <TabsTrigger value="qr" className="text-xs">
                <QrCode className="w-4 h-4 ml-1" />
                QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل *</Label>
                  <Input
                    id="name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    required
                    disabled={checkInMutation.isPending || isGettingLocation}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId">الرقم الجامعي *</Label>
                  <Input
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="أدخل رقمك الجامعي"
                    required
                    disabled={checkInMutation.isPending || isGettingLocation}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="example@email.com"
                    disabled={checkInMutation.isPending || isGettingLocation}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={checkInMutation.isPending || isGettingLocation}
                >
                  {(checkInMutation.isPending || isGettingLocation) && (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  )}
                  {isGettingLocation ? "جاري الحصول على الموقع..." : "تسجيل الحضور"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="pin" className="space-y-4 mt-4">
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">رقم PIN (6 أرقام)</Label>
                  <Input
                    id="pin"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    disabled={isPinVerifying}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isPinVerifying || pinInput.length !== 6}
                >
                  {isPinVerifying && (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  )}
                  متابعة
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4 mt-4">
              {!showScanner ? (
                <Button onClick={startScanner} className="w-full" size="lg">
                  <Camera className="w-5 h-5 ml-2" />
                  فتح الكاميرا
                </Button>
              ) : (
                <div className="space-y-4">
                  <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
                  <Button onClick={stopScanner} variant="outline" className="w-full">
                    <X className="w-4 h-4 ml-2" />
                    إغلاق الكاميرا
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
