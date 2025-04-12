// app/trunks/page.tsx
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
  Globe,
  Plus,
  Search,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash,
  RefreshCw,
} from "lucide-react";
import { getTrunks, deleteTrunk, Trunk } from "@/lib/api";

export default function TrunksPage() {
  const router = useRouter();
  const [trunks, setTrunks] = useState<Trunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trunkToDelete, setTrunkToDelete] = useState<Trunk | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTrunks = async () => {
    setLoading(true);
    try {
      const data = await getTrunks();
      setTrunks(data);
    } catch (error) {
      console.error("Failed to fetch trunks:", error);
      toast.error("Failed to load trunks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrunks();
  }, []);

  const handleDelete = async () => {
    if (!trunkToDelete) return;

    setIsDeleting(true);
    try {
      await deleteTrunk(trunkToDelete._id as string);
      toast.success(`Trunk ${trunkToDelete.name} deleted successfully`);
      setTrunks(trunks.filter((trunk) => trunk._id !== trunkToDelete._id));
    } catch (error) {
      console.error("Failed to delete trunk:", error);
      toast.error("Failed to delete trunk");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTrunkToDelete(null);
    }
  };

  const filteredTrunks = trunks.filter((trunk) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      trunk.name.toLowerCase().includes(query) ||
      trunk.host.toLowerCase().includes(query) ||
      trunk.type.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <PageHeader title="Trunks" description="Manage your SIP trunks" />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTrunks}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button asChild>
            <Link href="/trunks/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Trunk
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trunks..."
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
        ) : filteredTrunks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No trunks found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery
                ? "No trunks match your search criteria."
                : "You haven't created any trunks yet."}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link href="/trunks/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Trunk
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Context</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrunks.map((trunk) => (
                <TableRow key={trunk._id}>
                  <TableCell className="font-medium">{trunk.name}</TableCell>
                  <TableCell>{trunk.type}</TableCell>
                  <TableCell>{trunk.host}</TableCell>
                  <TableCell>{trunk.context || "from-trunk"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/trunks/${trunk._id}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setTrunkToDelete(trunk);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
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
            <DialogTitle>Delete Trunk</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete trunk{" "}
              <span className="font-medium">{trunkToDelete?.name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
