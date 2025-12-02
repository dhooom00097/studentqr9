import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowRight, Download, Users, QrCode as QrCodeIcon, MapPin, Plus, Trash2, Upload, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import QRCode from "qrcode";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function SessionDetails() {
  const [, params] = useRoute("/session/:id");
  const [, setLocation] = useLocation();
  const sessionId = params?.id ? parseInt(params.id) : 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState({ lat: "", lon: "", radius: "500" });
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: session, isLoading, refetch } = trpc.sessions.getById.useQuery(
    { id: sessionId },
    { enabled: sessionId > 0 }
  );

  const isClassSession = !!session?.classId;

  const { data: attendance, refetch: refetchAttendance } = trpc.attendance.getBySession.useQuery(
    { sessionId },
    { enabled: sessionId > 0 }
  );

  const toggleSessionMutation = trpc.sessions.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الجلسة");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const toggleStatusMutation = trpc.attendance.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الحضور");
      refetchAttendance();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الحالة");
    },
  });

  const updateLocationMutation = trpc.sessions.updateLocation.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث موقع الجلسة");
      setIsEditingLocation(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const { data: allowedStudents, refetch: refetchAllowedStudents } = trpc.sessions.getAllowedStudents.useQuery(
    { sessionId },
    { enabled: sessionId > 0 }
  );

  const addAllowedStudentMutation = trpc.sessions.addAllowedStudent.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الطالب للقائمة");
      setNewStudentId("");
      setNewStudentName("");
      refetchAllowedStudents();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const addAllowedStudentsBulkMutation = trpc.sessions.addAllowedStudentsBulk.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الطلاب بنجاح");
      refetchAllowedStudents();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const removeAllowedStudentMutation = trpc.sessions.removeAllowedStudent.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الطالب من القائمة");
      refetchAllowedStudents();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleAddAllowedStudent = () => {
    if (!newStudentId) {
      toast.error("يرجى إدخال الرقم الجامعي");
      return;
    }
    addAllowedStudentMutation.mutate({
      sessionId,
      studentId: newStudentId,
      studentName: newStudentName || undefined,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<{ [key: string]: any }>(worksheet, { header: 1 });

      // Skip header row and parse data
      const students = jsonData.slice(1)
        .filter((row: any) => row[0]) // Filter rows with student ID
        .map((row: any) => ({
          studentId: String(row[0]).trim(),
          studentName: row[1] ? String(row[1]).trim() : undefined,
        }));

      if (students.length === 0) {
        toast.error("لم يتم العثور على بيانات في الملف");
        return;
      }

      addAllowedStudentsBulkMutation.mutate({ sessionId, students });
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("حدث خطأ في قراءة الملف. تأكد من صحة التنسيق");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    removeAllowedStudentMutation.mutate({ sessionId, studentId });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocationInput({
          lat: position.coords.latitude.toString(),
          lon: position.coords.longitude.toString(),
          radius: locationInput.radius,
        });
      });
    } else {
      toast.error("المتصفح لا يدعم تحديد الموقع");
    }
  };

  const handleSaveLocation = () => {
    if (!locationInput.lat || !locationInput.lon) {
      toast.error("يرجى إدخال الإحداثيات");
      return;
    }
    updateLocationMutation.mutate({
      id: sessionId,
      latitude: parseFloat(locationInput.lat),
      longitude: parseFloat(locationInput.lon),
      radius: parseInt(locationInput.radius) || 500,
    });
  };

  useEffect(() => {
    if (session && canvasRef.current) {
      const qrUrl = `${window.location.origin}/checkin/${session.sessionCode}`;
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#1e40af",
          light: "#ffffff",
        },
      });
    }
  }, [session]);

  useEffect(() => {
    if (session && session.latitude && session.longitude) {
      setLocationInput({
        lat: session.latitude.toString(),
        lon: session.longitude.toString(),
        radius: (session.radius || 500).toString(),
      });
    }
  }, [session]);

  const handleDownloadQR = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `qr-${session?.title || "session"}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleExportAttendance = () => {
    if (!attendance || attendance.length === 0) {
      toast.error("لا توجد سجلات حضور للتصدير");
      return;
    }

    const data = attendance.map((record: any, index) => ({
      "#": index + 1,
      "اسم الطالب": record.studentName || record.name,
      "الرقم الجامعي": record.studentId || "-",
      "البريد الإلكتروني": record.studentEmail || record.email || "-",
      "موقع الطالب": record.studentLatitude && record.studentLongitude
        ? `${record.studentLatitude}, ${record.studentLongitude}`
        : "-",
      "وقت الحضور": record.checkedInAt ? new Date(record.checkedInAt).toLocaleString("ar-SA") : "غائب",
      "الحالة": record.status === 'present' || record.checkedInAt ? "حاضر" : "غائب",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الحضور");

    // Set column widths
    ws["!cols"] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 25 },
    ];

    XLSX.writeFile(wb, `حضور-${session?.title || "جلسة"}.xlsx`);
    toast.success("تم تصدير الملف بنجاح");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>الجلسة غير موجودة</CardTitle>
            <CardDescription>لم يتم العثور على الجلسة المطلوبة</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/teacher")}>
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setLocation("/teacher")} className="mb-4">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للوحة التحكم
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{session.title}</h1>
              {session.description && (
                <p className="text-gray-600">{session.description}</p>
              )}
            </div>
            <Badge variant={session.isActive ? "default" : "secondary"} className="text-lg px-4 py-2">
              {session.isActive ? "نشطة" : "مغلقة"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCodeIcon className="w-5 h-5" />
                رمز QR للحضور
              </CardTitle>
              <CardDescription>
                يمكن للطلاب مسح هذا الرمز لتسجيل حضورهم
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <canvas ref={canvasRef} />
              </div>
              <div className="w-full p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-white text-center">
                <p className="text-sm font-medium mb-1">رقم الجلسة (PIN)</p>
                <p className="text-4xl font-bold tracking-widest">{session.pin}</p>
                <p className="text-xs mt-2 opacity-90">يمكن للطلاب إدخال هذا الرقم يدوياً</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button onClick={handleDownloadQR} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 ml-2" />
                  تحميل الرمز
                </Button>
              </div>
              <div className="flex items-center gap-3 w-full p-4 bg-gray-50 rounded-lg">
                <Switch
                  id="active-status"
                  checked={Boolean(session.isActive)}
                  onCheckedChange={(checked) => {
                    toggleSessionMutation.mutate({ id: session.id, isActive: checked });
                  }}
                  disabled={toggleSessionMutation.isPending}
                />
                <Label htmlFor="active-status" className="cursor-pointer">
                  {session.isActive ? "الجلسة مفتوحة للحضور" : "الجلسة مغلقة"}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                إحصائيات الحضور
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="text-gray-700 font-medium">إجمالي الحضور</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {attendance?.length || 0}
                  </span>
                </div>
                {isClassSession && (
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="text-gray-700 font-medium">نسبة الحضور</span>
                    <span className="text-3xl font-bold text-green-600">
                      {attendance && attendance.length > 0
                        ? Math.round((attendance.filter((r: any) => r.status === 'present' || r.checkedInAt).length / attendance.length) * 100)
                        : 0}%
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">تاريخ الإنشاء</span>
                  <span className="text-gray-900">
                    {new Date(session.createdAt).toLocaleDateString("ar-SA")}
                  </span>
                </div>
                <Button
                  onClick={handleExportAttendance}
                  disabled={!attendance || attendance.length === 0}
                  className="w-full"
                  variant="default"
                >
                  <Download className="w-4 h-4 ml-2" />
                  تصدير سجل الحضور (Excel)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              موقع الجلسة الجغرافي
            </CardTitle>
            <CardDescription>
              حدد موقع الجامعة للتحقق من أن الطلاب يسجلون من الموقع الصحيح
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isEditingLocation ? (
              <div className="space-y-4">
                {session.latitude && session.longitude ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">خط العرض</p>
                        <p className="text-lg font-semibold">{session.latitude}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">خط الطول</p>
                        <p className="text-lg font-semibold">{session.longitude}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">نطاق التسجيل</p>
                      <p className="text-lg font-semibold">{session.radius || 500} متر</p>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${session.latitude},${session.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm block"
                    >
                      فتح في Google Maps
                    </a>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">لم يتم تحديد موقع للجلسة بعد</p>
                )}
                <Button
                  onClick={() => setIsEditingLocation(true)}
                  variant="outline"
                  className="w-full"
                >
                  تحديث الموقع
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>خط العرض (Latitude)</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={locationInput.lat}
                    onChange={(e) =>
                      setLocationInput({ ...locationInput, lat: e.target.value })
                    }
                    placeholder="24.7136"
                  />
                </div>
                <div className="space-y-2">
                  <Label>خط الطول (Longitude)</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={locationInput.lon}
                    onChange={(e) =>
                      setLocationInput({ ...locationInput, lon: e.target.value })
                    }
                    placeholder="46.6753"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نطاق التسجيل (متر)</Label>
                  <Input
                    type="number"
                    value={locationInput.radius}
                    onChange={(e) =>
                      setLocationInput({ ...locationInput, radius: e.target.value })
                    }
                    placeholder="500"
                  />
                </div>
                <Button
                  onClick={handleGetCurrentLocation}
                  variant="outline"
                  className="w-full"
                >
                  <MapPin className="w-4 h-4 ml-2" />
                  استخدم موقعي الحالي
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveLocation}
                    className="flex-1"
                    disabled={updateLocationMutation.isPending}
                  >
                    {updateLocationMutation.isPending && (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    )}
                    حفظ الموقع
                  </Button>
                  <Button
                    onClick={() => setIsEditingLocation(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hide Allowed Students Card if it's a Class Session */}
        {!isClassSession && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                قائمة الطلاب المسموح لهم (Whitelist)
              </CardTitle>
              <CardDescription>
                حدد الطلاب المسموح لهم بالتسجيل في هذه الجلسة. إذا كانت القائمة فارغة، سيسمح للجميع بالتسجيل.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6 items-end">
                <div className="flex-1 space-y-2">
                  <Label>الرقم الجامعي (مطلوب)</Label>
                  <Input
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="مثال: 441234567"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>اسم الطالب (اختياري)</Label>
                  <Input
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="اسم الطالب"
                  />
                </div>
                <Button
                  onClick={handleAddAllowedStudent}
                  disabled={addAllowedStudentMutation.isPending}
                >
                  {addAllowedStudentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 ml-2" />
                  )}
                  إضافة
                </Button>
              </div>

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  disabled={addAllowedStudentsBulkMutation.isPending}
                  className="flex-1"
                >
                  {addAllowedStudentsBulkMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Upload className="w-4 h-4 ml-2" />
                  )}
                  رفع ملف Excel/CSV
                </Button>
              </div>

              {allowedStudents && allowedStudents.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-right p-3 font-semibold">الرقم الجامعي</th>
                        <th className="text-right p-3 font-semibold">الاسم</th>
                        <th className="text-right p-3 font-semibold">تاريخ الإضافة</th>
                        <th className="text-right p-3 font-semibold">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allowedStudents.map((student) => (
                        <tr key={student.id} className="border-t">
                          <td className="p-3 font-medium">{student.studentId}</td>
                          <td className="p-3">{student.studentName || "-"}</td>
                          <td className="p-3 text-gray-500">
                            {new Date(student.createdAt).toLocaleDateString("ar-SA")}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveStudent(student.studentId)}
                              disabled={removeAllowedStudentMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                  <p className="text-gray-500">القائمة فارغة - التسجيل متاح للجميع</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Attendance List */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الحضور</CardTitle>
            <CardDescription>
              {attendance?.length || 0} طالب سجل حضوره
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendance && attendance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3 font-semibold">#</th>
                      <th className="text-right p-3 font-semibold">اسم الطالب</th>
                      <th className="text-right p-3 font-semibold">الرقم الجامعي</th>
                      <th className="text-right p-3 font-semibold">البريد الإلكتروني</th>
                      <th className="text-right p-3 font-semibold">الموقع</th>
                      <th className="text-right p-3 font-semibold">الحالة</th>
                      <th className="text-right p-3 font-semibold">وقت الحضور</th>
                      <th className="text-right p-3 font-semibold">إجراءات</th> {/* Added Actions column */}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record: any, index) => (
                      <tr key={record.id || index} className={`border-b hover:bg-gray-50 ${isClassSession && !(record.status === 'present' || record.checkedInAt) ? 'bg-red-50' : ''}`}>
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3 font-medium">{record.studentName || record.name}</td>
                        <td className="p-3 text-gray-600">
                          {record.studentId || "-"}
                        </td>
                        <td className="p-3 text-gray-600">
                          {record.studentEmail || record.email || "-"}
                        </td>
                        <td className="p-3 text-gray-600 text-xs">
                          {record.studentLatitude && record.studentLongitude ? (
                            <a
                              href={`https://maps.google.com/?q=${record.studentLatitude},${record.studentLongitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              عرض على الخريطة
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3">
                          {record.status === 'present' || record.checkedInAt ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1">
                              <CheckCircle className="w-3 h-3" />
                              حاضر
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              غائب
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">
                          {record.checkedInAt ? new Date(record.checkedInAt).toLocaleString("ar-SA") : "-"}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate({
                              sessionId: session.id,
                              studentId: record.studentId,
                              status: record.status === 'present' ? 'absent' : 'present',
                              studentName: record.name || record.studentName,
                            })}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {record.status === 'present' ? "تغيير لغائب" : "تغيير لحاضر"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>لم يسجل أي طالب حضوره بعد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
