import { Card, CardContent } from "@/components/ui/card";
import { MapPin, BedDouble, Bath, Maximize, Shield } from "lucide-react";
import { Link } from "react-router-dom";

interface PropertyCardProps {
    id: number;
    title: string;
    propertyType: "house" | "apartment" | "land" | "commercial" | "villa";
    listingType: "sale" | "rent";
    city: string;
    state: string;
    price: number;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    aiEstimatedArea?: number;
    aiCrackDetected?: boolean;
    verificationTier: "standard";
    photos: string[];
}

function formatPrice(price: number, listingType: string) {
    if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
        return `₹${(price / 100000).toFixed(0)} L`;
    } else if (price >= 1000) {
        return `₹${(price / 1000).toFixed(0)}K`;
    }
    return `₹${price}`;
}

export function PropertyCard({
    id,
    title,
    propertyType,
    listingType,
    city,
    state,
    price,
    bedrooms,
    bathrooms,
    area,
    aiEstimatedArea,
    aiCrackDetected,
    verificationTier,
    photos,
}: PropertyCardProps) {
    const displayArea = aiEstimatedArea || area;
    const primaryPhoto = photos[0]
        ? `http://localhost:8000${photos[0]}`
        : "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80";

    return (
        <Link to={`/property/${id}`}>
            <Card className="property-card group hover-up bg-card">
                {/* Image */}
                <div className="relative aspect-property overflow-hidden">
                    <img
                        src={primaryPhoto}
                        alt={title}
                        className="img-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80";
                        }}
                    />

                    {/* Simple badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                        <span className={`badge-sale ${listingType === 'rent' ? 'bg-accent/10 text-accent' : ''}`}>
                            {listingType === "sale" ? "For Sale" : "For Rent"}
                        </span>
                    </div>

                    <div className="absolute top-3 right-3">
                        <span className="badge-verified">
                            <Shield className="w-3 h-3" />
                            Verified
                        </span>
                    </div>
                </div>

                <CardContent className="p-4 space-y-3">
                    {/* Price */}
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-xl font-semibold text-foreground">
                                {formatPrice(price, listingType)}
                            </span>
                            {listingType === "rent" && (
                                <span className="text-sm text-muted-foreground">/mo</span>
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                            {propertyType}
                        </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-foreground line-clamp-1">
                        {title}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center text-muted-foreground text-sm">
                        <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span className="line-clamp-1">{city}, {state}</span>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
                        {bedrooms && (
                            <div className="flex items-center gap-1">
                                <BedDouble className="w-4 h-4" />
                                <span>{bedrooms} bed</span>
                            </div>
                        )}
                        {bathrooms && (
                            <div className="flex items-center gap-1">
                                <Bath className="w-4 h-4" />
                                <span>{bathrooms} bath</span>
                            </div>
                        )}
                        {displayArea && (
                            <div className="flex items-center gap-1">
                                <Maximize className="w-4 h-4" />
                                <span>{displayArea.toFixed(0)} m²</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default PropertyCard;
