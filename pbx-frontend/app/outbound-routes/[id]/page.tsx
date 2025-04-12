"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import {
  getOutboundRoute,
  createOutboundRoute,
  updateOutboundRoute,
  getTrunks,
  Trunk,
} from "@/lib/api";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Tên route là bắt buộc")
    .refine(
      (val) => /^[a-zA-Z0-9_.-]+$/.test(val),
      "Tên route chỉ được chứa ký tự chữ số, chữ cái, gạch dưới, dấu chấm và gạch ngang"
    ),
  pattern: z.string().min(1, "Pattern là bắt buộc"),
  trunk: z.string().min(1, "Trunk là bắt buộc"),
  prepend: z.string().optional(),
  prefix: z.string().optional(),
  callerIdName: z.string().optional(),
  callerIdNumber: z.string().optional(),
  priority: z.coerce
    .number()
    .int()
    .min(0, "Độ ưu tiên phải là số nguyên dương")
    .default(0),
});

type FormValues = z.infer<typeof formSchema>;

export default function OutboundRouteFormPage() {
  const router = useRouter();
  const params = useParams();
  const isEditMode = !!params.id && params.id !== "new";

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trunks, setTrunks] = useState<Trunk[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      pattern: "",
      trunk: "",
      prepend: "",
      prefix: "",
      callerIdName: "",
      callerIdNumber: "",
      priority: 0,
    },
  });

  useEffect(() => {
    const fetchTrunks = async () => {
      try {
        const data = await getTrunks();
        setTrunks(data);
      } catch (error) {
        console.error("Lỗi khi tải danh sách trunks:", error);
        toast.error("Không thể tải danh sách trunks");
      }
    };

    fetchTrunks();
  }, []);

  useEffect(() => {
    const fetchOutboundRoute = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);
        const route = await getOutboundRoute(params.id as string);

        // Reset form with fetched data
        form.reset({
          name: route.name,
          pattern: route.pattern,
          trunk: route.trunk,
          prepend: route.prepend || "",
          prefix: route.prefix || "",
          callerIdName: route.callerIdName || "",
          callerIdNumber: route.callerIdNumber || "",
          priority: route.priority || 0,
        });

        setError(null);
      } catch (err: any) {
        console.error("Lỗi khi tải dữ liệu outbound route:", err);
        setError(
          err.response?.data?.message ||
            "Không thể tải dữ liệu outbound route. Vui lòng thử lại."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOutboundRoute();
  }, [params.id, isEditMode, form]);

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    setError(null);

    try {
      if (isEditMode) {
        await updateOutboundRoute(params.id as string, data);
        toast.success("Outbound route đã được cập nhật");
      } else {
        await createOutboundRoute(data);
        toast.success("Outbound route đã được tạo");
      }

      // Quay lại trang danh sách
      router.push("/outbound-routes");
    } catch (err: any) {
      console.error("Lỗi khi lưu outbound route:", err);
      setError(
        err.response?.data?.message ||
          `Không thể ${
            isEditMode ? "cập nhật" : "tạo"
          } outbound route. Vui lòng thử lại.`
      );
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <PageHeader
          title={isEditMode ? "Sửa Outbound Route" : "Tạo Outbound Route Mới"}
          description={
            isEditMode
              ? `Cập nhật route ${form.watch("name")}`
              : "Tạo route mới cho cuộc gọi đi"
          }
        />
        <Button variant="outline" asChild>
          <Link href="/outbound-routes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Thông tin Route</CardTitle>
                <CardDescription>
                  Thiết lập cách xử lý cuộc gọi ra
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên Route</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="outbound-route-1"
                            disabled={saving}
                          />
                        </FormControl>
                        <FormDescription>
                          Tên định danh cho route
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Độ ưu tiên</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            disabled={saving}
                          />
                        </FormControl>
                        <FormDescription>
                          Độ ưu tiên (số thấp hơn = ưu tiên cao hơn)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="pattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pattern</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="_XXXXXXXXX"
                          disabled={saving}
                        />
                      </FormControl>
                      <FormDescription>
                        Mẫu số điện thoại sẽ khớp với route này (ví dụ:
                        _9XXXXXXXX, _X., _0Z.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trunk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trunk</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={saving || trunks.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trunk" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {trunks.length > 0 ? (
                            trunks.map((trunk) => (
                              <SelectItem key={trunk._id} value={trunk.name}>
                                {trunk.name} ({trunk.host})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-trunks" disabled>
                              Không có trunk nào
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Trunk sẽ được sử dụng để thực hiện cuộc gọi
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="prepend"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prepend</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="0" disabled={saving} />
                        </FormControl>
                        <FormDescription>
                          Thêm các chữ số này vào đầu số điện thoại
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prefix</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="9" disabled={saving} />
                        </FormControl>
                        <FormDescription>
                          Xóa các chữ số đầu này khỏi số điện thoại
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="callerIdName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Caller ID Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Company Name"
                            disabled={saving}
                          />
                        </FormControl>
                        <FormDescription>
                          Tên hiển thị cho người nhận
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="callerIdNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Caller ID Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="0123456789"
                            disabled={saving}
                          />
                        </FormControl>
                        <FormDescription>
                          Số điện thoại hiển thị cho người nhận
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => router.push("/outbound-routes")}
                  disabled={saving}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? "Đang cập nhật..." : "Đang tạo..."}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditMode ? "Cập nhật Route" : "Tạo Route"}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </DashboardLayout>
  );
}
