import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Settings, UserPlus, Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TeacherSettings() {
    // Create Teacher State
    const [newTeacher, setNewTeacher] = useState({
        username: "",
        password: "",
        name: "",
    });

    // Change Password State
    const [passwordData, setPasswordData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Mutations
    const createTeacherMutation = trpc.auth.createTeacher.useMutation({
        onSuccess: () => {
            toast.success("تم إنشاء حساب المعلم بنجاح");
            setNewTeacher({ username: "", password: "", name: "" });
        },
        onError: (error) => {
            toast.error(error.message || "حدث خطأ");
        },
    });

    const changePasswordMutation = trpc.auth.changePassword.useMutation({
        onSuccess: () => {
            toast.success("تم تغيير كلمة المرور بنجاح");
            setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
        },
        onError: (error) => {
            toast.error(error.message || "حدث خطأ");
        },
    });

    // Handlers
    const handleCreateTeacher = () => {
        if (!newTeacher.username || !newTeacher.password || !newTeacher.name) {
            toast.error("يرجى ملء جميع الحقول");
            return;
        }

        if (newTeacher.username.length < 3) {
            toast.error("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
            return;
        }

        if (newTeacher.password.length < 6) {
            toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
            return;
        }

        createTeacherMutation.mutate(newTeacher);
    };

    const { data: user } = trpc.auth.me.useQuery();

    const handleChangePassword = () => {
        if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error("يرجى ملء جميع الحقول");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("كلمة المرور الجديدة غير متطابقة");
            return;
        }

        if (!user?.id) {
            toast.error("حدث خطأ في معرف المستخدم");
            return;
        }

        changePasswordMutation.mutate({
            userId: user.id,
            oldPassword: passwordData.oldPassword,
            newPassword: passwordData.newPassword,
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6" dir="rtl">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <Settings className="w-8 h-8 text-blue-600" />
                    <h1 className="text-3xl font-bold text-gray-900">الإعدادات</h1>
                </div>

                {/* Create Teacher Card */}
                <Card className="p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <UserPlus className="w-6 h-6 text-green-600" />
                        <h2 className="text-2xl font-bold text-gray-800">إضافة معلم جديد</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="username">اسم المستخدم</Label>
                            <Input
                                id="username"
                                type="text"
                                value={newTeacher.username}
                                onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
                                placeholder="أدخل اسم المستخدم (3 أحرف على الأقل)"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="name">الاسم الكامل</Label>
                            <Input
                                id="name"
                                type="text"
                                value={newTeacher.name}
                                onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                                placeholder="أدخل الاسم الكامل"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="password">كلمة المرور</Label>
                            <Input
                                id="password"
                                type="password"
                                value={newTeacher.password}
                                onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                                placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                                className="mt-1"
                            />
                        </div>

                        <Button
                            onClick={handleCreateTeacher}
                            disabled={createTeacherMutation.isPending}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            {createTeacherMutation.isPending ? "جاري الإنشاء..." : "إنشاء حساب"}
                        </Button>
                    </div>
                </Card>

                {/* Change Password Card */}
                <Card className="p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <Key className="w-6 h-6 text-blue-600" />
                        <h2 className="text-2xl font-bold text-gray-800">تغيير كلمة المرور</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="oldPassword">كلمة المرور الحالية</Label>
                            <Input
                                id="oldPassword"
                                type="password"
                                value={passwordData.oldPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                placeholder="أدخل كلمة المرور الحالية"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder="أعد إدخال كلمة المرور الجديدة"
                                className="mt-1"
                            />
                        </div>

                        <Button
                            onClick={handleChangePassword}
                            disabled={changePasswordMutation.isPending}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {changePasswordMutation.isPending ? "جاري التغيير..." : "تغيير كلمة المرور"}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
