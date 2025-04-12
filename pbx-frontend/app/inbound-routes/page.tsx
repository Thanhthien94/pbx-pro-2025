"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Plus,
  Search,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash,
  RefreshCw,
  PhoneIncoming,
} from "lucide-react";
import { getInboundRoutes, deleteInboundRoute, InboundRoute } from "@/lib/api";

export default function InboundRoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<InboundRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<InboundRoute | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const data = await getInboundRoutes();
      setRoutes(data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu inbound routes:", error);
      toast.error("Không thể tải danh sách inbound routes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleDelete = async () => {
    if (!routeToDelete) return;

    setIsDeleting(true);
    try {
      await deleteInboundRoute(routeToDelete._id as string);
      toast.success(`Inbound route ${routeToDelete.name} đã được xóa`);
      setRoutes(routes.filter((route) => route._id !== routeToDelete._id));
    } catch (error) {
      console.error("Lỗi khi xóa inbound route:", error);
      toast.error("Không thể xóa inbound route");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setRouteToDelete(null);
    }
  };

  const filteredRoutes = routes.filter((route) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      route.name.toLowerCase().includes(query) ||
      (route.did && route.did.toLowerCase().includes(query)) ||
      route.destination.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <PageHeader
          title="Inbound Routes"
          description="Quản lý các route gọi vào"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRoutes}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Làm mới
          </Button>
          <Button asChild>
            <Link href="/inbound-routes/new">
              <Plus className="mr-2 h-4 w-4" />
              Thêm route
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm inbound routes..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <PhoneIncoming className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">
              Không tìm thấy route nào
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery
                ? "Không có route nào phù hợp với từ khóa tìm kiếm của bạn."
                : "Bạn chưa tạo inbound route nào."}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link href="/inbound-routes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm route
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>DID</TableHead>
                <TableHead>Đích đến</TableHead>
                <TableHead>Loại đích đến</TableHead>
                <TableHead>Độ ưu tiên</TableHead>
                <TableHead className="w-[100px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.map((route) => (
                <TableRow key={route._id}>
                  <TableCell className="font-medium">{route.name}</TableCell>
                  <TableCell>{route.did || "-"}</TableCell>
                  <TableCell>{route.destination}</TableCell>
                  <TableCell>
                    {route.destinationType === "extension" && "Extension"}
                    {route.destinationType === "queue" && "Queue"}
                    {route.destinationType === "ivr" && "IVR"}
                  </TableCell>
                  <TableCell>{route.priority || 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/inbound-routes/${route._id}`)
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setRouteToDelete(route);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa Inbound Route</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa route{" "}
              <span className="font-medium">{routeToDelete?.name}</span>?
              <br />
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Xóa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
