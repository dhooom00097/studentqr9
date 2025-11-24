import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, QrCode, Users, Clock, Eye, Trash2, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function TeacherDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const loggedIn = localStorage.getItem("teacher_logged_in") === "true";
    setIsLoggedIn(loggedIn);
    setLoading(false);
    if (!loggedIn) {
      setLocation("/teacher-login");
    }
  }, [setLocation]);

  const { data: sessions, isLoading, refetch } = trpc.sessions.list.useQuery(
    undefined,
    { enabled: isLoggedIn }
  );
  const createMutation = trpc.sessions.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الجلسة بنجاح");
      setIsCreateDialogOpen(false);
      setTitle("");
      setDescription("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الجلسة");
    },
  });

  const deleteMutation = trpc.sessions.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الجلسة بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الجلسة");
    },
  });

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الجلسة");
      return;
    }
    createMutation.mutate({ title, description });
  };

  const handleLogout = () => {
    localStorage.removeItem("teacher_logged_in");
    toast.success("تم تسجيل الخروج");
    setLocation("/teacher-login");
  };

  if (loading || isLoading) {
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
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">لوحة تحكم المعلم</h1>
            <p className="text-gray-600">مرحباً بك</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setLocation("/settings")} variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              الإعدادات
            </Button>
            <Button onClick={handleLogout} variant="outline">
              تسجيل الخروج
            </Button>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                إنشاء جلسة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء جلسة حضور جديدة</DialogTitle>
                <DialogDescription>
                  أدخل تفاصيل الجلسة لإنشاء رمز QR للحضور
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الجلسة *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: محاضرة الرياضيات - الأسبوع الأول"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">الوصف (اختياري)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="وصف مختصر للجلسة..."
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
                    إنشاء الجلسة
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sessions Grid */}
        {sessions && sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">لا توجد جلسات بعد</h3>
              <p className="text-gray-600 mb-4">ابدأ بإنشاء جلسة حضور جديدة</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 ml-2" />
                إنشاء جلسة
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions?.map((session) => (
              <Card key={session.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl">{session.title}</CardTitle>
                    <Badge variant={session.isActive ? "default" : "secondary"}>
                      {session.isActive ? "نشطة" : "مغلقة"}
                    </Badge>
                  </div>
                  {session.description && (
                    <CardDescription className="line-clamp-2">
                      {session.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(session.createdAt).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1 gap-2"
                      onClick={() => setLocation(`/session/${session.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                      عرض التفاصيل
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذه الجلسة؟")) {
                          deleteMutation.mutate({ id: session.id });
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
