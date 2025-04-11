'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Phone, 
  Plus, 
  Search, 
  Loader2, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Phone as PhoneIcon,
  RefreshCw
} from 'lucide-react';
import { getExtensions, deleteExtension, Extension, originateCall } from '@/lib/api';

export default function ExtensionsPage() {
  const router = useRouter();
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [extensionToDelete, setExtensionToDelete] = useState<Extension | null>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [extensionToCall, setExtensionToCall] = useState<Extension | null>(null);
  const [destinationExtension, setDestinationExtension] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  const fetchExtensions = async () => {
    setLoading(true);
    try {
      const data = await getExtensions();
      setExtensions(data);
    } catch (error) {
      console.error('Failed to fetch extensions:', error);
      toast.error('Failed to load extensions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtensions();
  }, []);

  const handleDelete = async () => {
    if (!extensionToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteExtension(extensionToDelete._id as string);
      toast.success(`Extension ${extensionToDelete.extension} deleted successfully`);
      setExtensions(extensions.filter(ext => ext._id !== extensionToDelete._id));
    } catch (error) {
      console.error('Failed to delete extension:', error);
      toast.error('Failed to delete extension');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setExtensionToDelete(null);
    }
  };
  
  const handleCall = async () => {
    if (!extensionToCall) return;
    
    setIsCalling(true);
    try {
      await originateCall({
        channel: `SIP/${extensionToCall.extension}`,
        extension: destinationExtension,
        context: 'from-internal',
        priority: 1
      });
      toast.success(`Calling ${extensionToCall.extension} to ${destinationExtension}`);
    } catch (error) {
      console.error('Failed to originate call:', error);
      toast.error('Failed to originate call');
    } finally {
      setIsCalling(false);
      setCallDialogOpen(false);
      setExtensionToCall(null);
      setDestinationExtension('');
    }
  };
  
  const filteredExtensions = extensions.filter(extension => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      extension.extension.toLowerCase().includes(query) ||
      extension.name.toLowerCase().includes(query) ||
      extension.context?.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Extensions" 
          description="Manage your SIP extensions"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchExtensions}
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
            <Link href="/extensions/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Extension
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search extensions..."
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
        ) : filteredExtensions.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Phone className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No extensions found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery 
                ? "No extensions match your search criteria."
                : "You haven't created any extensions yet."}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link href="/extensions/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Extension
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Extension</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Host</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExtensions.map((extension) => (
                <TableRow key={extension._id}>
                  <TableCell className="font-medium">{extension.extension}</TableCell>
                  <TableCell>{extension.name}</TableCell>
                  <TableCell>{extension.context || 'from-internal'}</TableCell>
                  <TableCell>{extension.host || 'dynamic'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/extensions/${extension._id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setExtensionToCall(extension);
                            setCallDialogOpen(true);
                          }}
                        >
                          <PhoneIcon className="mr-2 h-4 w-4" />
                          Call
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setExtensionToDelete(extension);
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
            <DialogTitle>Delete Extension</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete extension{' '}
              <span className="font-medium">
                {extensionToDelete?.extension} ({extensionToDelete?.name})
              </span>
              ? This action cannot be undone.
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
      
      {/* Call Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Originate Call</DialogTitle>
            <DialogDescription>
              Call extension {extensionToCall?.extension} ({extensionToCall?.name})
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Destination Extension</label>
                <Input
                  placeholder="Enter destination extension"
                  value={destinationExtension}
                  onChange={(e) => setDestinationExtension(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The extension that will be called from {extensionToCall?.extension}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCallDialogOpen(false)}
              disabled={isCalling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCall}
              disabled={isCalling || !destinationExtension}
            >
              {isCalling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <PhoneIcon className="mr-2 h-4 w-4" />
                  Call
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}