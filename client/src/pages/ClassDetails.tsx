import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, ArrowRight, Trash2, UserPlus, Upload, Download, FileSpreadsheet } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";
import * as XLSX from 'xlsx';

export default function ClassDetails() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [, setLocation] = useLocation();
    const [, params] = useRoute("/classes/:id");
    const classId = parseInt(params?.id || "0");

    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [studentName, setStudentName] = useState("");
    const [studentId, setStudentId] = useState("");
    const [studentEmail, setStudentEmail] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loggedIn = localStorage.getItem("teacher_logged_in") === "true";
        setIsLoggedIn(loggedIn);
        setLoading(false);
        if (!loggedIn) {
            setLocation("/teacher-login");
        }
    }, [setLocation]);

    const { data: classData, isLoading: isClassLoading } = trpc.classes.getById.useQuery(
        { id: classId },
        { enabled: !!classId && isLoggedIn }
    );

    const { data: students, isLoading: isStudentsLoading, refetch } = trpc.classes.getStudents.useQuery(
        { classId },
        { enabled: !!classId && isLoggedIn }
    );

    const { data: attendanceReport, isLoading: isReportLoading } = trpc.classes.getAttendanceReport.useQuery(
        { classId },
        { enabled: !!classId && isLoggedIn }
    );

    const addStudentMutation = trpc.classes.addStudent.useMutation({
        onSuccess: () => {
            toast.success("تم إضافة الطالب بنجاح");
            setIsAddStudentOpen(false);
            setStudentName("");
            setStudentId("");
            setStudentEmail("");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "حدث خطأ أثناء إضافة الطالب");
        },
    });

    const addStudentsBulkMutation = trpc.classes.addStudentsBulk.useMutation({
        onSuccess: () => {
            toast.success("تم استيراد الطلاب بنجاح");
            if (fileInputRef.current) fileInputRef.current.value = "";
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "حدث خطأ أثناء استيراد الطلاب");
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
    });

    const removeStudentMutation = trpc.classes.removeStudent.useMutation({
        onSuccess: () => {
            toast.success("تم حذف الطالب بنجاح");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "حدث خطأ أثناء حذف الطالب");
        },
    });

    const handleAddStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentName.trim() || !studentId.trim()) {
            toast.error("يرجى إدخال اسم الطالب والرقم الجامعي");
            return;
        }
        addStudentMutation.mutate({
            classId,
            name: studentName,
            studentId: studentId,
            email: studentEmail || undefined,
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                // Assume format: [Name, StudentID, Email]
                // Skip header row if exists (simple check: if first row has "Name" or similar)
                const studentsToAdd: any[] = [];

                // Start from index 1 if header exists, else 0. Let's try to detect.
                let startIndex = 0;
                if (data.length > 0 && typeof data[0][0] === 'string' &&
                    (String(data[0][0]).toLowerCase().includes('name') || String(data[0][0]).includes('اسم'))) {
                    startIndex = 1;
                }

                // Detect columns based on content of the first valid row
                let nameIdx = 0;
                let idIdx = 1;
                let emailIdx = 2;

                // Check first data row (after header)
                if (data.length > startIndex) {
                    const firstRow: any = data[startIndex];
                    if (firstRow) {
                        const col0 = firstRow[0] ? String(firstRow[0]).trim() : "";
                        const col1 = firstRow[1] ? String(firstRow[1]).trim() : "";

                        // If col0 looks like an ID (digits) and col1 looks like a name (letters/non-digits), swap
                        // Using a simple regex: ID is mostly digits, Name has letters
                        const isCol0Numeric = /^\d+$/.test(col0);
                        const isCol1Numeric = /^\d+$/.test(col1);

                        if (isCol0Numeric && !isCol1Numeric) {
                            nameIdx = 1;
                            idIdx = 0;
                            console.log("Detected swapped columns: ID is first, Name is second");
                        }
                    }
                }

                for (let i = startIndex; i < data.length; i++) {
                    const row: any = data[i];
                    if (row[nameIdx] && row[idIdx]) { // Name and ID required
                        studentsToAdd.push({
                            name: String(row[nameIdx]).trim(),
                            studentId: String(row[idIdx]).trim(),
                            email: row[emailIdx] ? String(row[emailIdx]).trim() : undefined,
                        });
                    }
                }

                if (studentsToAdd.length > 0) {
                    if (confirm(`سيتم إضافة ${studentsToAdd.length} طالب. هل أنت متأكد؟`)) {
                        addStudentsBulkMutation.mutate({
                            classId,
                            students: studentsToAdd,
                        });
                    } else {
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    }
                } else {
                    toast.error("لم يتم العثور على بيانات صالحة في الملف");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }

            } catch (error) {
                console.error("Error parsing file:", error);
                toast.error("حدث خطأ أثناء قراءة الملف");
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleExportReport = () => {
        if (!attendanceReport || !attendanceReport.report.length) {
            toast.error("لا توجد بيانات للتصدير");
            return;
        }

        // Prepare headers
        const headers = [
            "اسم الطالب",
            "الرقم الجامعي",
            "نسبة الحضور %",
            "عدد الحضور",
            "إجمالي الجلسات",
            ...attendanceReport.sessions.map((s: any) => `${s.title} (${new Date(s.createdAt).toLocaleDateString('ar-SA')})`)
        ];

        // Prepare data rows
        const data = attendanceReport.report.map((row: any) => {
            const rowData: any = {
                "اسم الطالب": row.student.name,
                "الرقم الجامعي": row.student.studentId,
                "نسبة الحضور %": `${row.stats.percentage}%`,
                "عدد الحضور": row.stats.present,
                "إجمالي الجلسات": row.stats.total,
            };

            attendanceReport.sessions.forEach((session: any) => {
                const status = row.attendance[session.id];
                const header = `${session.title} (${new Date(session.createdAt).toLocaleDateString('ar-SA')})`;
                rowData[header] = status === 'present' ? 'حاضر' : 'غائب';
            });

            return rowData;
        });

        const ws = XLSX.utils.json_to_sheet(data, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "تقرير الحضور");

        // Set column widths
        const wscols = [
            { wch: 20 }, // Name
            { wch: 15 }, // ID
            { wch: 12 }, // %
            { wch: 10 }, // Present
            { wch: 12 }, // Total
            ...attendanceReport.sessions.map(() => ({ wch: 15 })) // Sessions
        ];
        ws['!cols'] = wscols;

        XLSX.writeFile(wb, `تقرير_حضور_${classData?.name || classId}.xlsx`);
    };

    if (loading || isClassLoading || isStudentsLoading || isReportLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isLoggedIn) {
        return null;
    }

    if (!classData) {
        return <div>الفصل غير موجود</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => setLocation("/classes")}>
                            <ArrowRight className="w-5 h-5 ml-2" />
                            العودة للفصول
                        </Button>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">{classData.name}</h1>
                            <p className="text-gray-600">{classData.description || "لا يوجد وصف"}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={addStudentsBulkMutation.isPending}
                        >
                            {addStudentsBulkMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            استيراد (Excel)
                        </Button>

                        <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="gap-2">
                                    <UserPlus className="w-5 h-5" />
                                    إضافة طالب
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>إضافة طالب جديد</DialogTitle>
                                    <DialogDescription>
                                        أدخل بيانات الطالب لإضافته للفصل
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddStudent} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="studentName">اسم الطالب *</Label>
                                        <Input
                                            id="studentName"
                                            value={studentName}
                                            onChange={(e) => setStudentName(e.target.value)}
                                            placeholder="الاسم الثلاثي"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="studentId">الرقم الجامعي *</Label>
                                        <Input
                                            id="studentId"
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value)}
                                            placeholder="مثال: 441000000"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="studentEmail">البريد الإلكتروني (اختياري)</Label>
                                        <Input
                                            id="studentEmail"
                                            type="email"
                                            value={studentEmail}
                                            onChange={(e) => setStudentEmail(e.target.value)}
                                            placeholder="example@university.edu.sa"
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsAddStudentOpen(false)}
                                        >
                                            إلغاء
                                        </Button>
                                        <Button type="submit" disabled={addStudentMutation.isPending}>
                                            {addStudentMutation.isPending && (
                                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                            )}
                                            إضافة
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Tabs defaultValue="students" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="students">قائمة الطلاب</TabsTrigger>
                        <TabsTrigger value="report">تقرير الحضور</TabsTrigger>
                    </TabsList>

                    <TabsContent value="students">
                        <Card>
                            <CardHeader>
                                <CardTitle>قائمة الطلاب ({students?.length || 0})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {students && students.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-right">الاسم</TableHead>
                                                <TableHead className="text-right">الرقم الجامعي</TableHead>
                                                <TableHead className="text-right">البريد الإلكتروني</TableHead>
                                                <TableHead className="text-right">تاريخ الإضافة</TableHead>
                                                <TableHead className="text-left">إجراءات</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.map((student) => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-medium">{student.name}</TableCell>
                                                    <TableCell>{student.studentId}</TableCell>
                                                    <TableCell>{student.email || "-"}</TableCell>
                                                    <TableCell>
                                                        {new Date(student.createdAt).toLocaleDateString('ar-SA')}
                                                    </TableCell>
                                                    <TableCell className="text-left">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => {
                                                                if (confirm(`هل أنت متأكد من حذف الطالب ${student.name}؟`)) {
                                                                    removeStudentMutation.mutate({ id: student.id });
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        لا يوجد طلاب في هذا الفصل بعد
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="report">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>تقرير الحضور الشامل</CardTitle>
                                <Button variant="outline" onClick={handleExportReport} className="gap-2">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    تصدير تقرير شامل (Excel)
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {isReportLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : attendanceReport && attendanceReport.report.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-right min-w-[150px]">الطالب</TableHead>
                                                    <TableHead className="text-center">نسبة الحضور</TableHead>
                                                    {attendanceReport.sessions.map((session: any) => (
                                                        <TableHead key={session.id} className="text-center min-w-[100px]">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(session.createdAt).toLocaleDateString('ar-SA')}
                                                                </span>
                                                                <span className="font-medium text-xs truncate max-w-[100px]" title={session.title}>
                                                                    {session.title}
                                                                </span>
                                                            </div>
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {attendanceReport.report.map((row: any) => (
                                                    <TableRow key={row.student.id}>
                                                        <TableCell className="font-medium">
                                                            <div>{row.student.name}</div>
                                                            <div className="text-xs text-gray-500">{row.student.studentId}</div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.stats.percentage >= 75 ? "bg-green-100 text-green-800" :
                                                                row.stats.percentage >= 50 ? "bg-yellow-100 text-yellow-800" :
                                                                    "bg-red-100 text-red-800"
                                                                }`}>
                                                                {row.stats.percentage}%
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-1">
                                                                {row.stats.present} / {row.stats.total}
                                                            </div>
                                                        </TableCell>
                                                        {attendanceReport.sessions.map((session: any) => (
                                                            <TableCell key={session.id} className="text-center">
                                                                {row.attendance[session.id] === 'present' ? (
                                                                    <span className="text-green-600 text-lg">✓</span>
                                                                ) : (
                                                                    <span className="text-red-300 text-lg">✗</span>
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        لا توجد بيانات حضور لعرضها
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
