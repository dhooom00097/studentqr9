import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Users, Trash2, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Classes() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [, setLocation] = useLocation();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        const loggedIn = localStorage.getItem("teacher_logged_in") === "true";
        setIsLoggedIn(loggedIn);
        setLoading(false);
        if (!loggedIn) {
            setLocation("/teacher-login");
        }
    }, [setLocation]);

    const { data: classes, isLoading: isQueryLoading, refetch } = trpc.classes.list.useQuery(undefined, {
        enabled: isLoggedIn
    });

    const createMutation = trpc.classes.create.useMutation({
        onSuccess: () => {
            toast.success("تم إنشاء الفصل بنجاح");
            setIsCreateDialogOpen(false);
            setName("");
            setDescription("");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "حدث خطأ أثناء إنشاء الفصل");
        },
    });

    const deleteMutation = trpc.classes.delete.useMutation({
        onSuccess: () => {
            toast.success("تم حذف الفصل بنجاح");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "حدث خطأ أثناء حذف الفصل");
        },
    });

    const handleCreateClass = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("يرجى إدخال اسم الفصل");
            return;
        }
        createMutation.mutate({ name, description });
    };

    if (loading || isQueryLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isLoggedIn) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => setLocation("/teacher")}>
                            <ArrowRight className="w-5 h-5 ml-2" />
                            العودة للرئيسية
                        </Button>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">إدارة الفصول</h1>
                            <p className="text-gray-600">قم بإدارة فصولك والطلاب المسجلين</p>
                        </div>
                    </div>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="gap-2">
                                <Plus className="w-5 h-5" />
                                إنشاء فصل جديد
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>إنشاء فصل دراسي جديد</DialogTitle>
                                <DialogDescription>
                                    أدخل تفاصيل الفصل لإنشائه
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateClass} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">اسم الفصل *</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="مثال: رياضيات 101"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">الوصف (اختياري)</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="وصف مختصر للفصل..."
                                        rows={3}
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateDialogOpen(false)}
                                    >
                                        إلغاء
                                    </Button>
                                    <Button type="submit" disabled={createMutation.isPending}>
                                        {createMutation.isPending && (
                                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                        )}
                                        إنشاء الفصل
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Classes Grid */}
                {classes && classes.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-semibold mb-2">لا توجد فصول بعد</h3>
                            <p className="text-gray-600 mb-4">ابدأ بإنشاء فصل دراسي جديد</p>
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="w-4 h-4 ml-2" />
                                إنشاء فصل
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classes?.map((cls) => (
                            <Card key={cls.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle className="text-xl">{cls.name}</CardTitle>
                                    {cls.description && (
                                        <CardDescription className="line-clamp-2">
                                            {cls.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="default"
                                            className="flex-1 gap-2"
                                            onClick={() => setLocation(`/classes/${cls.id}`)}
                                        >
                                            <Users className="w-4 h-4" />
                                            عرض الطلاب
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => {
                                                if (confirm("هل أنت متأكد من حذف هذا الفصل؟ سيتم حذف جميع الطلاب المسجلين فيه.")) {
                                                    deleteMutation.mutate({ id: cls.id });
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                        >
                                            {deleteMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
