import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/VerificationBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    MapPin, BedDouble, Bath, Maximize, Phone, Mail, User,
    Calendar, ShieldCheck, Sparkles, AlertTriangle, ChevronLeft,
    ChevronRight, Home, IndianRupee, CheckCircle2, Building2,
    Loader2, Share2, Heart
} from "lucide-react";

const API_BASE = "http://localhost:8000";

interface PropertyDetail {
    id: number;
    seller_name: string;
    seller_phone: string | null;
    title: string;
    description: string | null;
    property_type: string;
    listing_type: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    price: number;
    bedrooms: number | null;
    bathrooms: number | null;
    claimed_area: number | null;
    ai_estimated_area: number | null;
    ai_room_type: string | null;
    ai_confidence: number | null;
    ai_crack_detected: boolean;
    verification_tier: "standard";
    verification_status: string;
    is_verified: boolean;
    photos: string[];
    created_at: string;
}

function formatPrice(price: number, listingType: string) {
    if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(2)} Cr`;
    } else if (price >= 100000) {
        return `₹${(price / 100000).toFixed(2)} Lakh`;
    } else if (price >= 1000) {
        return `₹${(price / 1000).toFixed(1)}K`;
    }
    return `₹${price.toLocaleString()}`;
}

export default function PropertyDetailPage() {
    const { propertyId } = useParams<{ propertyId: string }>();
    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showContactInfo, setShowContactInfo] = useState(false);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const res = await fetch(`${API_BASE}/properties/${propertyId}`);
                if (!res.ok) throw new Error("Property not found");

                const data = await res.json();
                setProperty(data);
            } catch (error) {
                console.error("Error fetching property:", error);
                toast.error("Failed to load property details");
            } finally {
                setLoading(false);
            }
        };

        if (propertyId) {
            fetchProperty();
        }
    }, [propertyId]);

    const nextImage = () => {
        if (property) {
            setCurrentImageIndex((prev) => (prev + 1) % property.photos.length);
        }
    };

    const prevImage = () => {
        if (property) {
            setCurrentImageIndex((prev) =>
                prev === 0 ? property.photos.length - 1 : prev - 1
            );
        }
    };

    const handleShare = async () => {
        try {
            await navigator.share({
                title: property?.title,
                url: window.location.href,
            });
        } catch {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard!");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                    <Skeleton className="h-[400px] w-full rounded-xl mb-6" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                        <div>
                            <Skeleton className="h-64 w-full" />
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-4 py-16 text-center">
                    <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
                    <p className="text-muted-foreground mb-6">
                        The property you're looking for doesn't exist or has been removed.
                    </p>
                    <Link to="/marketplace">
                        <Button>Browse Properties</Button>
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    const displayArea = property.ai_estimated_area || property.claimed_area;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                    <Link to="/marketplace" className="hover:text-foreground transition-colors">
                        Marketplace
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">{property.title}</span>
                </div>

                {/* Image Gallery */}
                <div className="relative h-[300px] md:h-[450px] rounded-2xl overflow-hidden mb-6 bg-muted">
                    {property.photos.length > 0 ? (
                        <>
                            <img
                                src={property.photos[currentImageIndex]}
                                alt={`${property.title} - Photo ${currentImageIndex + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";
                                }}
                            />

                            {/* Navigation Arrows */}
                            {property.photos.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <ChevronLeft className="h-6 w-6" />
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <ChevronRight className="h-6 w-6" />
                                    </button>
                                </>
                            )}

                            {/* Image Counter */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                                {currentImageIndex + 1} / {property.photos.length}
                            </div>

                            {/* Thumbnail Strip */}
                            {property.photos.length > 1 && (
                                <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2 overflow-x-auto pb-2">
                                    {property.photos.slice(0, 5).map((photo, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentImageIndex(idx)}
                                            className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${idx === currentImageIndex ? "border-white" : "border-transparent opacity-70"
                                                }`}
                                        >
                                            <img
                                                src={photo}
                                                alt={`Thumbnail ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-16 w-16 text-muted-foreground" />
                        </div>
                    )}

                    {/* Badges Overlay */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        <Badge className={`text-sm font-semibold ${property.listing_type === "sale"
                            ? "bg-primary text-primary-foreground"
                            : "bg-violet-500 text-white"
                            }`}>
                            For {property.listing_type === "sale" ? "Sale" : "Rent"}
                        </Badge>
                        <Badge variant="outline" className="bg-white/90 text-foreground capitalize">
                            {property.property_type}
                        </Badge>
                    </div>

                    <div className="absolute top-4 right-4">
                        <VerifiedBadge tier={property.verification_tier} size="md" />
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
                        >
                            <Share2 className="h-5 w-5 text-foreground" />
                        </button>
                        <button className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors">
                            <Heart className="h-5 w-5 text-foreground" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Title & Price */}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold mb-2">{property.title}</h1>
                            <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                <MapPin className="h-4 w-4" />
                                <span>{property.address}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl md:text-4xl font-bold text-primary">
                                    {formatPrice(property.price, property.listing_type)}
                                </span>
                                {property.listing_type === "rent" && (
                                    <span className="text-muted-foreground">/month</span>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {property.bedrooms && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <BedDouble className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="font-semibold">{property.bedrooms}</div>
                                        <div className="text-xs text-muted-foreground">Bedrooms</div>
                                    </div>
                                </div>
                            )}
                            {property.bathrooms && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Bath className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="font-semibold">{property.bathrooms}</div>
                                        <div className="text-xs text-muted-foreground">Bathrooms</div>
                                    </div>
                                </div>
                            )}
                            {displayArea && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Maximize className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="font-semibold">{displayArea.toFixed(0)} sq.m</div>
                                        <div className="text-xs text-muted-foreground">Area</div>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <Building2 className="h-5 w-5 text-primary" />
                                <div>
                                    <div className="font-semibold capitalize">{property.property_type}</div>
                                    <div className="text-xs text-muted-foreground">Type</div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {property.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>About this property</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground whitespace-pre-line">
                                        {property.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* AI Verification Details */}
                        <Card className="border-emerald-200 bg-emerald-50/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-emerald-700">
                                    <ShieldCheck className="h-5 w-5" />
                                    Verification Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-white">
                                        <div className="text-sm text-muted-foreground mb-1">Verification Tier</div>
                                        <div className="font-semibold">VisionEstate Verified</div>
                                    </div>
                                    {property.ai_estimated_area && (
                                        <div className="p-3 rounded-lg bg-white">
                                            <div className="text-sm text-muted-foreground mb-1">AI Estimated Area</div>
                                            <div className="font-semibold">{property.ai_estimated_area.toFixed(1)} sq.m</div>
                                        </div>
                                    )}
                                    {property.ai_room_type && (
                                        <div className="p-3 rounded-lg bg-white">
                                            <div className="text-sm text-muted-foreground mb-1">Detected Room Type</div>
                                            <div className="font-semibold capitalize">{property.ai_room_type}</div>
                                        </div>
                                    )}
                                    {property.ai_confidence && (
                                        <div className="p-3 rounded-lg bg-white">
                                            <div className="text-sm text-muted-foreground mb-1">AI Confidence</div>
                                            <div className="font-semibold">{property.ai_confidence.toFixed(0)}%</div>
                                        </div>
                                    )}
                                </div>

                                {/* Condition Note */}
                                <div className={`mt-4 p-3 rounded-lg flex items-start gap-3 ${property.ai_crack_detected
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-emerald-50 text-emerald-700"
                                    }`}>
                                    {property.ai_crack_detected ? (
                                        <>
                                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-medium">Minor Structural Issues Noted</div>
                                                <div className="text-sm opacity-80">
                                                    Our AI detected some cracks or structural issues. This has been disclosed to ensure transparency.
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-medium">No Structural Issues Detected</div>
                                                <div className="text-sm opacity-80">
                                                    Our AI analysis found no visible cracks or structural defects in the photos.
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Location */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-2">{property.address}</p>
                                <p className="font-medium">{property.city}, {property.state} - {property.pincode}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Contact & Actions */}
                    <div className="space-y-4">
                        {/* Contact Card */}
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle>Contact Seller</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{property.seller_name}</div>
                                        <div className="text-sm text-muted-foreground">Property Owner</div>
                                    </div>
                                </div>

                                {property.is_verified ? (
                                    showContactInfo && property.seller_phone ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{property.seller_phone}</span>
                                            </div>
                                            <Button className="w-full" asChild>
                                                <a href={`tel:${property.seller_phone}`}>
                                                    <Phone className="h-4 w-4 mr-2" />
                                                    Call Now
                                                </a>
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            onClick={() => setShowContactInfo(true)}
                                        >
                                            <Phone className="h-4 w-4 mr-2" />
                                            Show Contact Details
                                        </Button>
                                    )
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground py-4">
                                        Contact details available after verification
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span className="text-sm font-medium">Verified Property</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        This property has been verified by VisionEstate's AI and admin review team.
                                    </p>
                                </div>

                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Listed {new Date(property.created_at).toLocaleDateString()}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Safety Tips */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Safety Tips</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2">
                                <p>• Meet in a public place for initial discussions</p>
                                <p>• Always verify documents before making payments</p>
                                <p>• Use secure payment methods</p>
                                <p>• Report suspicious activity</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
