"use client";

import { useEffect, useState } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Phone,
  PhoneCall,
  Users,
  PhoneIncoming,
  PhoneOutgoing,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getDashboard, DashboardData } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getDashboard();
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sample data for the chart
  const chartData = [
    { name: "Sun", calls: 45 },
    { name: "Mon", calls: 92 },
    { name: "Tue", calls: 85 },
    { name: "Wed", calls: 78 },
    { name: "Thu", calls: 65 },
    { name: "Fri", calls: 55 },
    { name: "Sat", calls: 30 },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <PageHeader
          title="Dashboard"
          description="Overview of your Asterisk PBX system"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Extensions</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                data?.counts.extensions || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered SIP extensions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                data?.counts.activeCalls || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Current active calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queues</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                data?.counts.queues || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Configured call queues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Calls</CardTitle>
            <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                data?.counts.cdrsToday || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total calls today</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Call Activity</CardTitle>
            <CardDescription>Call volume over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="calls"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current Asterisk system information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                {loading ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-1 text-sm font-medium">Uptime</h4>
                      <p className="text-sm">
                        {data?.status?.CoreUptime || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <h4 className="mb-1 text-sm font-medium">Last Reload</h4>
                      <p className="text-sm">
                        {data?.status?.CoreLastReload || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <h4 className="mb-1 text-sm font-medium">
                        Active Channels
                      </h4>
                      <p className="text-sm">
                        {data?.status?.CoreCurrentCalls ||
                          data?.counts.activeCalls ||
                          0}{" "}
                        channels
                      </p>
                    </div>
                    <div>
                      <h4 className="mb-1 text-sm font-medium">
                        Current Calls
                      </h4>
                      <p className="text-sm">
                        {data?.status?.CoreCurrentCalls ||
                          data?.counts.activeCalls ||
                          0}{" "}
                        calls
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="details">
                {loading ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-1 text-sm font-medium">System Info</h4>
                      <pre className="rounded bg-muted p-2 text-xs">
                        {data?.status?.output ||
                          "Asterisk DAHDI\nAsterisk " +
                            (data?.status?.CoreStartupDate || "Unknown")}
                      </pre>
                    </div>
                    <div>
                      <h4 className="mb-1 text-sm font-medium">Status</h4>
                      <pre className="rounded bg-muted p-2 text-xs">
                        {`Active Channels: ${data?.counts.activeCalls || 0}
Calls: ${data?.counts.activeCalls || 0}
Uptime: ${data?.status?.CoreUptime || "Unknown"}`}
                      </pre>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
