import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, User, Mail, Phone, Home, Save, Clock } from "lucide-react";

const API_BASE = "http://localhost:8000";

interface UserProperty {
    id: number;
    title: string;
    status: string;
    created_at: string;
}

interface ActivityLog {
    id: number;
    property_id: number;
    property_title?: string;
    action: string;
    description: string;
    performed_by: string;
    timestamp: string;
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);

    const [profile, setProfile] = useState({
        name: user?.user_metadata?.full_name || "",
        email: user?.email || "",
        phone: "",
    });

    useEffect(() => {
        if (!user?.email) return;

        // Fetch user's properties
        const fetchProperties = async () => {
            try {
                const res = await fetch(`${API_BASE}/user/${user.email}/properties`);
                if (res.ok) {
                    const data = await res.json();
                    setProperties(data.properties);

                    // Fetch logs for all properties
                    const logsPromises = data.properties.map(async (prop: any) => {
                        const logsRes = await fetch(`${API_BASE}/properties/${prop.id}/logs`);
                        if (logsRes.ok) {
                            const logsData = await logsRes.json();
                            return logsData.logs.map((log: any) => ({
                                ...log,
                                property_title: prop.title
                            }));
                        }
                        return [];
                    });

                    const allLogsArrays = await Promise.all(logsPromises);
                    const combinedLogs = allLogsArrays.flat().sort((a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                    setAllLogs(combinedLogs.slice(0, 10)); // Show latest 10 activities
                }
            } catch (error) {
                console.error("Failed to fetch properties:", error);
            }
        };
        fetchProperties();
    }, [user]);

    const handleSave = async () => {
        setLoading(true);
        // In production, save to Supabase user metadata
        await new Promise(resolve => setTimeout(resolve, 500));
        toast.success("Profile updated!");
        setLoading(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'pending': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container-main section-spacing">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-foreground mb-2">My Profile</h1>
                    <p className="text-muted-foreground mb-8">
                        Manage your account settings and track your property submissions
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Left Column: Profile */}
                        <div className="md:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Personal Info</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Full Name</Label>
                                        <div className="relative mt-1">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="name"
                                                value={profile.name}
                                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                                placeholder="Your name"
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="email">Email</Label>
                                        <div className="relative mt-1">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                value={profile.email}
                                                disabled
                                                className="pl-10 bg-muted"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="phone">Phone</Label>
                                        <div className="relative mt-1">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                value={profile.phone}
                                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                placeholder="Your phone"
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>

                                    <Button onClick={handleSave} disabled={loading} className="w-full btn-black">
                                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Save Changes
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Properties Tracker */}
                        <div className="md:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        <span>My Properties</span>
                                        <span className="text-sm font-normal text-muted-foreground">{properties.length} submissions</span>
                                    </CardTitle>
                                    <CardDescription>Track verification status and history</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {properties.length === 0 ? (
                                        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                                            <Home className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                                            <h3 className="text-lg font-medium mb-1">No properties listed yet</h3>
                                            <p className="text-muted-foreground mb-4 text-sm">Submit your property for verification to get started.</p>
                                            <Button onClick={() => navigate("/list-property")} className="btn-black">
                                                List Property Now
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {properties.map((prop) => (
                                                <div
                                                    key={prop.id}
                                                    className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer group"
                                                    onClick={() => navigate(`/verification/${prop.id}`)}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{prop.title}</h3>
                                                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                                <span>{prop.city}</span>
                                                                <span>•</span>
                                                                <span>₹{prop.price.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${getStatusColor(prop.verification_status)}`}>
                                                            {prop.verification_status.replace('_', ' ')}
                                                        </span>
                                                    </div>

                                                    {/* Mini Timeline/Activity History */}
                                                    {prop.recent_logs && prop.recent_logs.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t space-y-3">
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Timeline</p>
                                                            {prop.recent_logs.slice(0, 3).map((log: any, idx: number) => (
                                                                <div key={idx} className="flex gap-3 relative">
                                                                    {idx !== prop.recent_logs.slice(0, 3).length - 1 && (
                                                                        <div className="absolute left-[5px] top-5 bottom-[-12px] w-[1px] bg-slate-200"></div>
                                                                    )}
                                                                    <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${idx === 0 ? 'bg-blue-500 ring-4 ring-blue-50' : 'bg-slate-300'}`}></div>
                                                                    <div className="flex-1 pb-1">
                                                                        <p className={`text-sm ${idx === 0 ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                                                                            {log.description}
                                                                        </p>
                                                                        <p className="text-[10px] text-muted-foreground">
                                                                            {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {log.performed_by}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {prop.recent_logs.length > 3 && (
                                                                <p className="text-xs text-blue-600 pl-6 pt-1 hover:underline">
                                                                    + {prop.recent_logs.length - 3} more updates
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Document Status */}
                                                    {prop.documents_summary && Object.keys(prop.documents_summary).length > 0 && (
                                                        <div className="mt-2 flex gap-2">
                                                            <div className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border">
                                                                {Object.values(prop.documents_summary as Record<string, number>).reduce((a, b) => a + b, 0)} Documents Uploaded
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Activity Timeline Section - Always Show */}
                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Activity Timeline
                            </CardTitle>
                            <CardDescription>Your recent activity across all properties</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {allLogs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No activity yet.</p>
                                    <p className="text-xs mt-1">Submit a property to start tracking your activity.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {allLogs.map((log, idx) => (
                                        <div
                                            key={log.id || idx}
                                            className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
                                        >
                                            <div className="relative">
                                                <div className={`h-3 w-3 rounded-full mt-1.5 ${idx === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-slate-300'
                                                    }`} />
                                                {idx < allLogs.length - 1 && (
                                                    <div className="absolute left-1 top-5 bottom-[-20px] w-[1px] bg-slate-200" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${idx === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                                    {log.description}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                    <span className="truncate max-w-[150px]">{log.property_title}</span>
                                                    <span>•</span>
                                                    <span>{new Date(log.timestamp).toLocaleString([], {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}</span>
                                                    <span>•</span>
                                                    <span className="capitalize">{log.performed_by}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
}
