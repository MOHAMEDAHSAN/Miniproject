import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { PropertyCard } from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X, Home, MapPin, Shield, ArrowRight } from "lucide-react";

const API_BASE = "http://localhost:8000";

interface Property {
    id: number;
    title: string;
    property_type: "house" | "apartment" | "land" | "commercial" | "villa";
    listing_type: "sale" | "rent";
    city: string;
    state: string;
    price: number;
    bedrooms: number | null;
    bathrooms: number | null;
    claimed_area: number | null;
    ai_estimated_area: number | null;
    ai_room_type: string | null;
    ai_confidence: number | null;
    ai_crack_detected: boolean;
    verification_tier: "standard";
    photos: string[];
    created_at: string;
}

const propertyTypes = [
    { value: "all", label: "All Types" },
    { value: "house", label: "House" },
    { value: "apartment", label: "Apartment" },
    { value: "land", label: "Land" },
    { value: "commercial", label: "Commercial" },
    { value: "villa", label: "Villa" },
];

export default function MarketplacePage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: "",
        propertyType: "all",
        listingType: "all",
        city: "",
    });
    const [showFilters, setShowFilters] = useState(false);

    const fetchProperties = async () => {
        setLoading(true);
        try {
            let url = `${API_BASE}/properties/verified?`;

            if (filters.propertyType !== "all") {
                url += `property_type=${filters.propertyType}&`;
            }
            if (filters.listingType !== "all") {
                url += `listing_type=${filters.listingType}&`;
            }
            if (filters.city) {
                url += `city=${encodeURIComponent(filters.city)}&`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch properties");

            const data = await res.json();
            setProperties(data.properties);
        } catch (error) {
            console.error("Error fetching properties:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [filters.propertyType, filters.listingType]);

    const filteredProperties = properties.filter(p => {
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            return (
                p.title.toLowerCase().includes(searchLower) ||
                p.city.toLowerCase().includes(searchLower) ||
                p.state.toLowerCase().includes(searchLower)
            );
        }
        return true;
    });

    const clearFilters = () => {
        setFilters({
            search: "",
            propertyType: "all",
            listingType: "all",
            city: "",
        });
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container-main section-spacing">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-foreground mb-3">
                        Browse <span className="text-primary">verified</span> properties
                    </h1>
                    <p className="text-muted-foreground max-w-xl text-responsive">
                        Every listing has been verified for accuracy.
                        What you see is what you get.
                    </p>
                </div>

                {/* Trust banner */}
                <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-accent" />
                    <span>All properties verified • Admin approved • No false listings</span>
                </div>

                {/* Search & Filters */}
                <div className="mb-8 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title, city..."
                                value={filters.search}
                                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                className="pl-10"
                            />
                        </div>

                        {/* Quick Filters */}
                        <div className="flex gap-2">
                            <Select
                                value={filters.listingType}
                                onValueChange={v => setFilters(f => ({ ...f, listingType: v }))}
                            >
                                <SelectTrigger className="w-[110px]">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="sale">Buy</SelectItem>
                                    <SelectItem value="rent">Rent</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.propertyType}
                                onValueChange={v => setFilters(f => ({ ...f, propertyType: v }))}
                            >
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue placeholder="Property" />
                                </SelectTrigger>
                                <SelectContent>
                                    {propertyTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Expanded Filters */}
                    {showFilters && (
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="text-sm font-medium mb-1 block">City</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Enter city"
                                            value={filters.city}
                                            onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                                            className="pl-10"
                                            onKeyDown={e => e.key === "Enter" && fetchProperties()}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <Button variant="ghost" onClick={clearFilters} size="sm">
                                        <X className="h-4 w-4 mr-1" />
                                        Clear
                                    </Button>
                                    <Button onClick={fetchProperties} size="sm" className="ml-2 btn-black">
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Count */}
                <p className="text-sm text-muted-foreground mb-6">
                    {loading ? "Loading..." : `${filteredProperties.length} properties found`}
                </p>

                {/* Properties Grid */}
                {loading ? (
                    <div className="grid-properties">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="rounded-lg border overflow-hidden animate-pulse">
                                <div className="aspect-property bg-muted" />
                                <div className="p-4 space-y-3">
                                    <div className="h-5 w-3/4 bg-muted rounded" />
                                    <div className="h-4 w-1/2 bg-muted rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredProperties.length === 0 ? (
                    <div className="text-center py-16">
                        <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No properties yet</h3>
                        <p className="text-muted-foreground mb-6 text-sm">
                            Properties will appear here once they're verified and approved.
                        </p>
                        <Button variant="outline" onClick={clearFilters}>
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid-properties">
                        {filteredProperties.map(property => (
                            <PropertyCard
                                key={property.id}
                                id={property.id}
                                title={property.title}
                                propertyType={property.property_type}
                                listingType={property.listing_type}
                                city={property.city}
                                state={property.state}
                                price={property.price}
                                bedrooms={property.bedrooms || undefined}
                                bathrooms={property.bathrooms || undefined}
                                area={property.claimed_area || undefined}
                                aiEstimatedArea={property.ai_estimated_area || undefined}
                                aiCrackDetected={property.ai_crack_detected}
                                verificationTier={property.verification_tier}
                                photos={property.photos}
                            />
                        ))}
                    </div>
                )}

                {/* CTA */}
                <div className="mt-16 text-center py-12 rounded-lg bg-warm border">
                    <h2 className="text-foreground mb-3">Have a property to list?</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto text-responsive">
                        Get your property verified and reach trusted buyers.
                    </p>
                    <Link to="/list-property">
                        <Button className="btn-black">
                            List Your Property
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
}
