import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    ShieldCheck, ShieldX, Clock, CheckCircle2, XCircle,
    Eye, Building2, MapPin, BadgeCheck, AlertTriangle,
    Sparkles, TrendingUp, Users, Home
} from "lucide-react";

const API_BASE = "http://localhost:8000";

interface PendingProperty {
    id: number;
    title: string;
    seller_name: string;
    seller_email: string;
    property_type: string;
    listing_type: string;
    city: string;
    state: string;
    price: number;
    photos: string[];
    verification_tier: string;
    verification_status: string;
    ai_estimated_area: number | null;
    ai_crack_detected: boolean;
    gemini_crack_verified: boolean;
    gemini_crack_is_real: boolean;
    gemini_crack_description: string | null;
    created_at: string;
}

interface AdminStats {
    pending_approval: number;
    approved_listings: number;
    rejected: number;
    total_properties: number;
}

export default function AdminDashboard() {
    const [properties, setProperties] = useState<PendingProperty[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState<PendingProperty | null>(null);
    const [notes, setNotes] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [processing, setProcessing] = useState(false);

    const fetchData = async () => {
        try {
            const [pendingRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/admin/properties/pending`),
                fetch(`${API_BASE}/admin/stats`)
            ]);

            if (pendingRes.ok) {
                const data = await pendingRes.json();
                setProperties(data.properties || []);
            }

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
            toast.error("Failed to load admin data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (propertyId: number) => {
        setProcessing(true);
        try {
            const formData = new FormData();
            if (notes) formData.append("notes", notes);

            const res = await fetch(`${API_BASE}/admin/properties/${propertyId}/approve`, {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                toast.success("Property approved and listed!");
                setSelectedProperty(null);
                setNotes("");
                fetchData();
            } else {
                const error = await res.json();
                toast.error(error.detail || "Failed to approve");
            }
        } catch (error) {
            toast.error("Failed to approve property");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (propertyId: number) => {
        if (!rejectReason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }

        setProcessing(true);
        try {
            const formData = new FormData();
            formData.append("reason", rejectReason);
            if (notes) formData.append("notes", notes);

            const res = await fetch(`${API_BASE}/admin/properties/${propertyId}/reject`, {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                toast.success("Property rejected");
                setSelectedProperty(null);
                setNotes("");
                setRejectReason("");
                fetchData();
            } else {
                const error = await res.json();
                toast.error(error.detail || "Failed to reject");
            }
        } catch (error) {
            toast.error("Failed to reject property");
        } finally {
            setProcessing(false);
        }
    };

    const formatPrice = (price: number) => {
        if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
        if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
        return `₹${price.toLocaleString()}`;
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container mx-auto px-6 py-12 max-w-7xl">
                {/* Header */}
                <div className="mb-12 pt-8">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">
                        Admin <span className="text-primary">Dashboard</span>
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Review and approve property listings
                    </p>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-amber-500/10">
                                        <Clock className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{stats.pending_approval}</div>
                                        <div className="text-xs text-muted-foreground">Pending</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-emerald-500/10">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{stats.approved_listings}</div>
                                        <div className="text-xs text-muted-foreground">Approved</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50 border-red-200 dark:bg-red-950/20">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-red-500/10">
                                        <XCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{stats.rejected}</div>
                                        <div className="text-xs text-muted-foreground">Rejected</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-primary/10">
                                        <Home className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{stats.total_properties}</div>
                                        <div className="text-xs text-muted-foreground">Total</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading properties...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && properties.length === 0 && (
                    <Card className="text-center py-12">
                        <CardContent>
                            <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                            <p className="text-muted-foreground">No properties pending approval</p>
                        </CardContent>
                    </Card>
                )}

                {/* Pending Properties Grid */}
                {!loading && properties.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {properties.map((property) => (
                            <Card key={property.id} className="overflow-hidden hover-lift">
                                {/* Property Image */}
                                <div className="relative h-48">
                                    {property.photos.length > 0 ? (
                                        <img
                                            src={`${API_BASE}${property.photos[0]}`}
                                            alt={property.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <Building2 className="w-12 h-12 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 flex gap-2">
                                        <Badge variant="secondary" className="bg-white/90">
                                            {property.listing_type === "sale" ? "For Sale" : "For Rent"}
                                        </Badge>
                                        <Badge className="bg-primary">
                                            {property.verification_tier}
                                        </Badge>
                                    </div>
                                    {property.ai_crack_detected && (
                                        <div className="absolute top-3 right-3">
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Crack Detected
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg line-clamp-1">{property.title}</CardTitle>
                                    <CardDescription className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {property.city}, {property.state}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xl font-bold">{formatPrice(property.price)}</span>
                                        {property.ai_estimated_area && (
                                            <span className="text-sm text-muted-foreground">
                                                ~{property.ai_estimated_area.toFixed(0)} sq.m
                                            </span>
                                        )}
                                    </div>

                                    {/* Gemini Verification Status */}
                                    {property.gemini_crack_verified && (
                                        <div className={`p-2 rounded-lg text-xs ${property.gemini_crack_is_real
                                            ? "bg-red-50 text-red-700 border border-red-200"
                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            }`}>
                                            <div className="flex items-center gap-1 font-medium">
                                                <Sparkles className="w-3 h-3" />
                                                Gemini: {property.gemini_crack_is_real ? "Real Crack" : "No Real Cracks"}
                                            </div>
                                        </div>
                                    )}

                                    {/* Seller Info */}
                                    <div className="text-sm text-muted-foreground">
                                        <span className="font-medium">Seller:</span> {property.seller_name}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => handleApprove(property.id)}
                                            disabled={processing}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={() => setSelectedProperty(property)}
                                            disabled={processing}
                                        >
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Reject Modal */}
                {selectedProperty && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <Card className="w-full max-w-md">
                            <CardHeader>
                                <CardTitle>Reject Property</CardTitle>
                                <CardDescription>
                                    {selectedProperty.title}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Rejection Reason *</label>
                                    <Textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Why is this property being rejected?"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Additional Notes</label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optional notes..."
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            setSelectedProperty(null);
                                            setRejectReason("");
                                            setNotes("");
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => handleReject(selectedProperty.id)}
                                        disabled={processing}
                                    >
                                        Confirm Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
