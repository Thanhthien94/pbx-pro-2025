'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { DashboardLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { getExtension, createExtension, updateExtension, Extension } from '@/lib/api';
import { isValidSipUsername, isValidHostname } from '@/lib/utils';

const formSchema = z.object({
  extension: z.string()
    .min(1, 'Extension number is required')
    .refine(isValidSipUsername, 'Extension can only contain alphanumeric characters, -, _, and .'),
  name: z.string().min(1, 'Name is required'),
  secret: z.string().min(6, 'Secret must be at least 6 characters'),
  context: z.string().default('from-internal'),
  host: z.string().default('dynamic')
    .refine(value => value === 'dynamic' || isValidHostname(value), 
      'Host must be a valid hostname, IP address, or "dynamic"'),
  callGroup: z.string().optional(),
  pickupGroup: z.string().optional(),
  mailbox: z.string().optional(),
  email: z.string().email('Must be a valid email').optional().or(z.literal('')),
  dtmfMode: z.enum(['rfc2833', 'info', 'inband', 'auto']).default('rfc2833'),
  transport: z.enum(['udp', 'tcp', 'tls', 'ws', 'wss']).default('udp'),
  nat: z.enum(['yes', 'no', 'force_rport', 'comedia']).default('yes'),
  callLimit: z.coerce.number().int().min(0, 'Must be 0 or greater').default(5),
  disallow: z.string().default('all'),
  allow: z.string().default('ulaw,alaw,g722')
});

type FormValues = z.infer<typeof formSchema>;

export default function ExtensionFormPage() {
  const router = useRouter();
  const params = useParams();
  const isEditMode = !!params.id && params.id !== 'new';
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      extension: '',
      name: '',
      secret: '',
      context: 'from-internal',
      host: 'dynamic',
      callGroup: '',
      pickupGroup: '',
      mailbox: '',
      email: '',
      dtmfMode: 'rfc2833',
      transport: 'udp',
      nat: 'yes',
      callLimit: 5,
      disallow: 'all',
      allow: 'ulaw,alaw,g722'
    }
  });
  
  useEffect(() => {
    const fetchExtension = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        const extension = await getExtension(params.id as string);
        
        // Reset form with fetched data
        form.reset({
          ...extension,
          // Ensure numerical values are handled properly
          callLimit: extension.callLimit || 5
        });
        
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch extension:', err);
        setError(
          err.response?.data?.message || 
          'Failed to load extension data. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchExtension();
  }, [params.id, isEditMode, form]);
  
  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    setError(null);
    
    try {
      if (isEditMode) {
        await updateExtension(params.id as string, data as Extension);
        toast.success('Extension updated successfully');
      } else {
        await createExtension(data as Extension);
        toast.success('Extension created successfully');
      }
      
      // Navigate back to extensions list
      router.push('/extensions');
    } catch (err: any) {
      console.error('Failed to save extension:', err);
      setError(
        err.response?.data?.message || 
        `Failed to ${isEditMode ? 'update' : 'create'} extension. Please try again.`
      );
      setSaving(false);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <PageHeader 
          title={isEditMode ? 'Edit Extension' : 'New Extension'} 
          description={
            isEditMode 
              ? `Update extension ${form.watch('extension')}`
              : 'Create a new SIP extension'
          }
        />
        <Button variant="outline" asChild>
          <Link href="/extensions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Extensions
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
                <CardTitle>Extension Information</CardTitle>
                <CardDescription>
                  Basic settings for the SIP extension
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="extension"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Extension Number</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., 101" 
                                disabled={isEditMode || saving}
                              />
                            </FormControl>
                            <FormDescription>
                              The extension number to dial
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., John Smith" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              The caller ID name for this extension
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="secret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secret</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="Enter a strong password" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              The password for SIP authentication
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="context"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Context</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="from-internal" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              The dialplan context for this extension
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="host"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Host</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="dynamic" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              Use &quot;dynamic&quot; for auto IP detection or specify an IP/hostname
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="email" 
                                placeholder="user@example.com" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              Email for voicemail notifications (optional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="callGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Call Group</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., 1" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              The call group this extension belongs to
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="pickupGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pickup Group</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., 1" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              The pickup group this extension belongs to
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="mailbox"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailbox</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., 101" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              The voicemail box for this extension
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="callLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Call Limit</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum number of concurrent calls
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="grid gap-6 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="dtmfMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>DTMF Mode</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={saving}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select DTMF mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="rfc2833">RFC 2833</SelectItem>
                                <SelectItem value="info">INFO</SelectItem>
                                <SelectItem value="inband">Inband</SelectItem>
                                <SelectItem value="auto">Auto</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              How DTMF tones are transmitted
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="transport"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transport</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={saving}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select transport" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="udp">UDP</SelectItem>
                                <SelectItem value="tcp">TCP</SelectItem>
                                <SelectItem value="tls">TLS</SelectItem>
                                <SelectItem value="ws">WebSocket</SelectItem>
                                <SelectItem value="wss">Secure WebSocket</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Transport protocol for SIP messages
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="nat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NAT</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={saving}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select NAT handling" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                                <SelectItem value="force_rport">Force rport</SelectItem>
                                <SelectItem value="comedia">Comedia</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              NAT traversal settings
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="disallow"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Disallow</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="all" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              Codecs to disallow (comma-separated)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="allow"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allow</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="ulaw,alaw,g722" 
                                disabled={saving}
                              />
                            </FormControl>
                            <FormDescription>
                              Codecs to allow (comma-separated)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => router.push('/extensions')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditMode ? 'Update Extension' : 'Create Extension'}
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