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
  getInboundRoute,
  createInboundRoute,
  updateInboundRoute,
  getExtensions,
  getQueues,
  Extension,
  Queue,
} from "@/lib/api";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Tên route là bắt buộc")
    .refine(
      (val) => /^[a-zA-Z0-9_.-]+$/.test(val),
      "Tên route chỉ được chứa ký tự chữ số, chữ cái, gạch dưới, dấu chấm và gạch ngang"
    ),
  did: z.string().optional(),
  destination: z.string().min(1, "Đích đến là bắt buộc"),
  destinationType: z.enum(["extension", "queue", "ivr"]),
  callerIdName: z.string().optional(),
  priority: z.coerce
    .number()
    .int()
    .min(0, "Độ ưu tiên phải là số nguyên dương")
    .default(0),
});

type FormValues = z.infer<typeof formSchema>;

export default function InboundRouteFormPage() {
  const router = useRouter();
  const params = useParams();
  const isEditMode = !!params.id && params.id !== "new";

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      did: "",
      destination: "",
      destinationType: "extension",
      callerIdName: "",
      priority: 0,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [extensionsData, queuesData] = await Promise.all([
          getExtensions(),
          getQueues(),
        ]);

        setExtensions(extensionsData);
        setQueues(queuesData);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu extensions/queues:", error);
        toast.error("Không thể tải danh sách extensions/queues");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchInboundRoute = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);
        const route = await getInboundRoute(params.id as string);

        // Reset form with fetched data
        form.reset({
          name: route.name,
          did: route.did || "",
          destination: route.destination,
          destinationType: route.destinationType,
          callerIdName: route.callerIdName || "",
          priority: route.priority || 0,
        });

        setError(null);
      } catch (err: any) {
        console.error("Lỗi khi tải dữ liệu inbound route:", err);
        setError(
          err.response?.data?.message ||
            "Không thể tải dữ liệu inbound route. Vui lòng thử lại."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInboundRoute();
  }, [params.id, isEditMode, form]);

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    setError(null);

    try {
      if (isEditMode) {
        await updateInboundRoute(params.id as string, data);
        toast.success("Inbound route đã được cập nhật");
      } else {
        await createInboundRoute(data);
        toast.success("Inbound route đã được tạo");
      }

      // Quay lại trang danh sách
      router.push("/inbound-routes");
    } catch (err: any) {
      console.error("Lỗi khi lưu inbound route:", err);
      setError(
        err.response?.data?.message ||
          `Không thể ${
            isEditMode ? "cập nhật" : "tạo"
          } inbound route. Vui lòng thử lại.`
      );
      setSaving(false);
    }
  };

  // Lấy danh sách destinations dựa vào destinationType
  const getDestinationOptions = () => {
    const destinationType = form.watch("destinationType");

    switch (destinationType) {
      case "extension":
        return extensions.map((ext) => ({
          value: ext.extension,
          label: `${ext.extension} (${ext.name})`,
        }));
      case "queue":
        return queues.map((queue) => ({
          value: queue.name,
          label: queue.name,
        }));
      case "ivr":
        // Giả sử có các IVR cố định
        return [
          { value: "main-ivr", label: "Main IVR" },
          { value: "sales-ivr", label: "Sales IVR" },
          { value: "support-ivr", label: "Support IVR" },
        ];
      default:
        return [];
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <PageHeader
          title={isEditMode ? "Sửa Inbound Route" : "Tạo Inbound Route Mới"}
          description={
            isEditMode
              ? `Cập nhật route ${form.watch("name")}`
              : "Tạo route mới cho cuộc gọi đến"
          }
        />
        <Button variant="outline" asChild>
          <Link href="/inbound-routes">
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
                  Thiết lập cách xử lý cuộc gọi đến
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
                            placeholder="inbound-route-1"
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
                  name="did"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DID (Direct Inward Dial)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0123456789"
                          disabled={saving}
                        />
                      </FormControl>
                      <FormDescription>
                        Số điện thoại nhận cuộc gọi đến (để trống để bắt tất cả
                        cuộc gọi vào)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="callerIdName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caller ID Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Incoming Call"
                          disabled={saving}
                        />
                      </FormControl>
                      <FormDescription>
                        Tên hiển thị ghi đè cho cuộc gọi đến (để trống để giữ
                        nguyên)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="destinationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loại đích đến</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={saving}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn loại đích đến" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="extension">Extension</SelectItem>
                            <SelectItem value="queue">Queue</SelectItem>
                            <SelectItem value="ivr">IVR</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Nơi cuộc gọi sẽ được chuyển hướng đến
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Đích đến</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={saving}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn đích đến" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getDestinationOptions().map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {form.watch("destinationType") === "extension" &&
                            "Extension sẽ nhận cuộc gọi"}
                          {form.watch("destinationType") === "queue" &&
                            "Queue sẽ xử lý cuộc gọi"}
                          {form.watch("destinationType") === "ivr" &&
                            "IVR sẽ trả lời cuộc gọi"}
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
                  onClick={() => router.push("/inbound-routes")}
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
