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
} from "lucide-react";
import {
  getOutboundRoutes,
  deleteOutboundRoute,
  OutboundRoute,
} from "@/lib/api";

export default function OutboundRoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<OutboundRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<OutboundRoute | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const data = await getOutboundRoutes();
      setRoutes(data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu outbound routes:", error);
      toast.error("Không thể tải danh sách outbound routes");
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
      await deleteOutboundRoute(routeToDelete._id as string);
      toast.success(`Outbound route ${routeToDelete.name} đã được xóa`);
      setRoutes(routes.filter((route) => route._id !== routeToDelete._id));
    } catch (error) {
      console.error("Lỗi khi xóa outbound route:", error);
      toast.error("Không thể xóa outbound route");
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
      route.pattern.toLowerCase().includes(query) ||
      route.trunk.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <PageHeader
          title="Outbound Routes"
          description="Quản lý các route gọi ra"
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
            <Link href="/outbound-routes/new">
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
            placeholder="Tìm kiếm outbound routes..."
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
            <ArrowRightLeft className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">
              Không tìm thấy route nào
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery
                ? "Không có route nào phù hợp với từ khóa tìm kiếm của bạn."
                : "Bạn chưa tạo outbound route nào."}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link href="/outbound-routes/new">
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
                <TableHead>Pattern</TableHead>
                <TableHead>Trunk</TableHead>
                <TableHead>Prepend/Prefix</TableHead>
                <TableHead>Độ ưu tiên</TableHead>
                <TableHead className="w-[100px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.map((route) => (
                <TableRow key={route._id}>
                  <TableCell className="font-medium">{route.name}</TableCell>
                  <TableCell>{route.pattern}</TableCell>
                  <TableCell>{route.trunk}</TableCell>
                  <TableCell>
                    {route.prepend && <span>Prepend: {route.prepend}</span>}
                    {route.prepend && route.prefix && <span> | </span>}
                    {route.prefix && <span>Prefix: {route.prefix}</span>}
                    {!route.prepend && !route.prefix && <span>-</span>}
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
                            router.push(`/outbound-routes/${route._id}`)
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
            <DialogTitle>Xóa Outbound Route</DialogTitle>
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
