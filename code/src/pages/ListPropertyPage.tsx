import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TierSelector, TierFeatureHighlights } from "@/components/TierSelector";
import { TermsConsent, DataAccuracyConsent, AIAnalysisConsent, InspectionConsent } from "@/components/ConsentCheckbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
    ArrowLeft, ArrowRight, Upload, X, Home, Building2,
    TreePine, Store, Castle, Check, Loader2, ImagePlus
} from "lucide-react";

const API_BASE = "http://localhost:8000";

const propertyTypes = [
    { value: "house", label: "House", icon: Home },
    { value: "apartment", label: "Apartment", icon: Building2 },
    { value: "land", label: "Land/Plot", icon: TreePine },
    { value: "commercial", label: "Commercial", icon: Store },
    { value: "villa", label: "Villa", icon: Castle },
];

const listingTypes = [
    { value: "sale", label: "For Sale" },
    { value: "rent", label: "For Rent" },
];

interface FormData {
    // Step 1: Seller Info
    sellerName: string;
    sellerEmail: string;
    sellerPhone: string;

    // Step 2: Property Type
    propertyType: string;
    listingType: string;

    // Step 3: Property Details
    title: string;
    description: string;
    price: string;

    // Step 4: Location
    address: string;
    city: string;
    state: string;
    pincode: string;

    // Step 5: Dimensions
    claimedArea: string;
    claimedWidth: string;
    claimedLength: string;
    bedrooms: string;
    bathrooms: string;

    // Step 6: Photos
    photos: File[];

    // Step 7: Verification Tier
    verificationTier: "standard";

    // Consents
    termsConsent: boolean;
    dataAccuracyConsent: boolean;
    aiAnalysisConsent: boolean;
    inspectionConsent: boolean;
}

const initialFormData: FormData = {
    sellerName: "",
    sellerEmail: "",
    sellerPhone: "",
    propertyType: "",
    listingType: "",
    title: "",
    description: "",
    price: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    claimedArea: "",
    claimedWidth: "",
    claimedLength: "",
    bedrooms: "",
    bathrooms: "",
    photos: [],
    verificationTier: "standard",
    termsConsent: false,
    dataAccuracyConsent: false,
    aiAnalysisConsent: false,
    inspectionConsent: false,
};

const steps = [
    { id: 1, title: "Seller Information", description: "Your contact details" },
    { id: 2, title: "Property Type", description: "What are you listing?" },
    { id: 3, title: "Property Details", description: "Title, description, price" },
    { id: 4, title: "Location", description: "Property address" },
    { id: 5, title: "Dimensions", description: "Area and room count" },
    { id: 6, title: "Photos", description: "Upload property images" },
    { id: 7, title: "Verification", description: "Choose verification level" },
    { id: 8, title: "Review & Submit", description: "Confirm and submit" },
];

export default function ListPropertyPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Auto-populate seller email from logged-in user
    useEffect(() => {
        if (user?.email && !formData.sellerEmail) {
            setFormData(prev => ({ ...prev, sellerEmail: user.email || '' }));
        }
    }, [user]);

    const updateFormData = (updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        // Clear errors for updated fields
        const updatedKeys = Object.keys(updates);
        setErrors(prev => {
            const newErrors = { ...prev };
            updatedKeys.forEach(key => delete newErrors[key]);
            return newErrors;
        });
    };

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        switch (step) {
            case 1:
                if (!formData.sellerName.trim()) newErrors.sellerName = "Name is required";
                if (!formData.sellerEmail.trim()) newErrors.sellerEmail = "Email is required";
                else if (!/\S+@\S+\.\S+/.test(formData.sellerEmail)) newErrors.sellerEmail = "Invalid email";
                if (!formData.sellerPhone.trim()) newErrors.sellerPhone = "Phone is required";
                else if (!/^\d{10}$/.test(formData.sellerPhone.replace(/\D/g, "")))
                    newErrors.sellerPhone = "Invalid phone number";
                break;
            case 2:
                if (!formData.propertyType) newErrors.propertyType = "Select property type";
                if (!formData.listingType) newErrors.listingType = "Select listing type";
                break;
            case 3:
                if (!formData.title.trim()) newErrors.title = "Title is required";
                if (!formData.price.trim()) newErrors.price = "Price is required";
                else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0)
                    newErrors.price = "Invalid price";
                break;
            case 4:
                if (!formData.address.trim()) newErrors.address = "Address is required";
                if (!formData.city.trim()) newErrors.city = "City is required";
                if (!formData.state.trim()) newErrors.state = "State is required";
                if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
                break;
            case 5:
                // Dimensions are optional but validate if provided
                if (formData.claimedArea && (isNaN(parseFloat(formData.claimedArea)) || parseFloat(formData.claimedArea) <= 0))
                    newErrors.claimedArea = "Invalid area";
                break;
            case 6:
                if (formData.photos.length === 0) newErrors.photos = "Upload at least one photo";
                break;
            case 7:
                // Tier selection always has a default
                break;
            case 8:
                if (!formData.termsConsent) newErrors.termsConsent = "You must agree to terms";
                if (!formData.dataAccuracyConsent) newErrors.dataAccuracyConsent = "You must confirm data accuracy";
                if (!formData.aiAnalysisConsent) newErrors.aiAnalysisConsent = "You must consent to AI analysis";
                // Inspection consent not required for standard tier
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newPhotos = [...formData.photos, ...acceptedFiles].slice(0, 10);
        updateFormData({ photos: newPhotos });
    }, [formData.photos]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
        maxFiles: 10,
    });

    const removePhoto = (index: number) => {
        const newPhotos = formData.photos.filter((_, i) => i !== index);
        updateFormData({ photos: newPhotos });
    };

    const handleSubmit = async () => {
        if (!validateStep(8)) return;

        setIsSubmitting(true);
        try {
            // Step 1: Submit property details
            const submitData = new FormData();
            submitData.append("seller_name", formData.sellerName);
            submitData.append("seller_email", formData.sellerEmail);
            submitData.append("seller_phone", formData.sellerPhone);
            submitData.append("property_type", formData.propertyType);
            submitData.append("listing_type", formData.listingType);
            submitData.append("title", formData.title);
            submitData.append("description", formData.description || "");
            submitData.append("address", formData.address);
            submitData.append("city", formData.city);
            submitData.append("state", formData.state);
            submitData.append("pincode", formData.pincode);
            submitData.append("price", formData.price);
            submitData.append("verification_tier", formData.verificationTier);

            if (formData.claimedArea) submitData.append("claimed_area", formData.claimedArea);
            if (formData.claimedWidth) submitData.append("claimed_width", formData.claimedWidth);
            if (formData.claimedLength) submitData.append("claimed_length", formData.claimedLength);
            if (formData.bedrooms) submitData.append("bedrooms", formData.bedrooms);
            if (formData.bathrooms) submitData.append("bathrooms", formData.bathrooms);

            console.log("Submitting to:", `${API_BASE}/properties/submit`);
            const submitRes = await fetch(`${API_BASE}/properties/submit`, {
                method: "POST",
                body: submitData,
            });

            console.log("Submit response status:", submitRes.status);
            if (!submitRes.ok) {
                const errorText = await submitRes.text();
                console.error("Submit error:", errorText);
                throw new Error(`Failed to submit property: ${errorText}`);
            }
            const submitResult = await submitRes.json();
            console.log("Submit result:", submitResult);
            const propertyId = submitResult.property_id;

            // Step 2: Upload photos
            const photoData = new FormData();
            formData.photos.forEach(photo => {
                photoData.append("files", photo);
            });

            console.log("Uploading photos to:", `${API_BASE}/properties/${propertyId}/upload-photos`);
            const photoRes = await fetch(`${API_BASE}/properties/${propertyId}/upload-photos`, {
                method: "POST",
                body: photoData,
            });

            console.log("Photo upload response status:", photoRes.status);
            if (!photoRes.ok) {
                const errorText = await photoRes.text();
                console.error("Photo upload error:", errorText);
                throw new Error(`Failed to upload photos: ${errorText}`);
            }

            toast.success("Property submitted successfully!");
            navigate(`/verification/${propertyId}`);
        } catch (error) {
            console.error("Submission error:", error);
            toast.error(`Failed to submit property: ${error instanceof Error ? error.message : 'Please try again.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const progress = (currentStep / steps.length) * 100;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container-main section-spacing max-w-3xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-foreground mb-2">
                        List Your Property
                    </h1>
                    <p className="text-muted-foreground">
                        Get your property verified and listed on VisionEstate
                    </p>
                </div>

                {/* Progress */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Step {currentStep} of {steps.length}</span>
                        <span>{steps[currentStep - 1].title}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Step Content */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{steps[currentStep - 1].title}</CardTitle>
                        <CardDescription>{steps[currentStep - 1].description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Step 1: Seller Information */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="sellerName">Full Name *</Label>
                                    <Input
                                        id="sellerName"
                                        value={formData.sellerName}
                                        onChange={e => updateFormData({ sellerName: e.target.value })}
                                        placeholder="Enter your full name"
                                        className={errors.sellerName ? "border-red-500" : ""}
                                    />
                                    {errors.sellerName && <p className="text-red-500 text-xs mt-1">{errors.sellerName}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="sellerEmail">Email Address *</Label>
                                    <Input
                                        id="sellerEmail"
                                        type="email"
                                        value={formData.sellerEmail}
                                        onChange={e => updateFormData({ sellerEmail: e.target.value })}
                                        placeholder="your@email.com"
                                        className={errors.sellerEmail ? "border-red-500" : ""}
                                    />
                                    {errors.sellerEmail && <p className="text-red-500 text-xs mt-1">{errors.sellerEmail}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="sellerPhone">Phone Number *</Label>
                                    <Input
                                        id="sellerPhone"
                                        value={formData.sellerPhone}
                                        onChange={e => updateFormData({ sellerPhone: e.target.value })}
                                        placeholder="10-digit mobile number"
                                        className={errors.sellerPhone ? "border-red-500" : ""}
                                    />
                                    {errors.sellerPhone && <p className="text-red-500 text-xs mt-1">{errors.sellerPhone}</p>}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Property Type */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <Label className="mb-3 block">Property Type *</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {propertyTypes.map(type => {
                                            const Icon = type.icon;
                                            const isSelected = formData.propertyType === type.value;
                                            return (
                                                <button
                                                    key={type.value}
                                                    onClick={() => updateFormData({ propertyType: type.value })}
                                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isSelected
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50"
                                                        }`}
                                                >
                                                    <Icon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                                    <span className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                                                        {type.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.propertyType && <p className="text-red-500 text-xs mt-1">{errors.propertyType}</p>}
                                </div>

                                <div>
                                    <Label className="mb-3 block">Listing Type *</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {listingTypes.map(type => {
                                            const isSelected = formData.listingType === type.value;
                                            return (
                                                <button
                                                    key={type.value}
                                                    onClick={() => updateFormData({ listingType: type.value })}
                                                    className={`p-4 rounded-xl border-2 transition-all font-medium ${isSelected
                                                        ? "border-primary bg-primary/5 text-primary"
                                                        : "border-border hover:border-primary/50"
                                                        }`}
                                                >
                                                    {type.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.listingType && <p className="text-red-500 text-xs mt-1">{errors.listingType}</p>}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Property Details */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="title">Property Title *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={e => updateFormData({ title: e.target.value })}
                                        placeholder="e.g., Spacious 3BHK Apartment in Koramangala"
                                        className={errors.title ? "border-red-500" : ""}
                                    />
                                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={e => updateFormData({ description: e.target.value })}
                                        placeholder="Describe your property features, amenities, nearby locations..."
                                        rows={4}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="price">
                                        Price * {formData.listingType === "rent" ? "(Monthly Rent)" : "(Sale Price)"}
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                        <Input
                                            id="price"
                                            type="number"
                                            value={formData.price}
                                            onChange={e => updateFormData({ price: e.target.value })}
                                            placeholder={formData.listingType === "rent" ? "25000" : "5000000"}
                                            className={`pl-8 ${errors.price ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                                </div>
                            </div>
                        )}

                        {/* Step 4: Location */}
                        {currentStep === 4 && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="address">Street Address *</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={e => updateFormData({ address: e.target.value })}
                                        placeholder="Full street address"
                                        className={errors.address ? "border-red-500" : ""}
                                    />
                                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="city">City *</Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={e => updateFormData({ city: e.target.value })}
                                            placeholder="City"
                                            className={errors.city ? "border-red-500" : ""}
                                        />
                                        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="state">State *</Label>
                                        <Input
                                            id="state"
                                            value={formData.state}
                                            onChange={e => updateFormData({ state: e.target.value })}
                                            placeholder="State"
                                            className={errors.state ? "border-red-500" : ""}
                                        />
                                        {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="pincode">Pincode *</Label>
                                    <Input
                                        id="pincode"
                                        value={formData.pincode}
                                        onChange={e => updateFormData({ pincode: e.target.value })}
                                        placeholder="6-digit pincode"
                                        className={errors.pincode ? "border-red-500" : ""}
                                    />
                                    {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
                                </div>
                            </div>
                        )}

                        {/* Step 5: Dimensions */}
                        {currentStep === 5 && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground mb-4">
                                    ℹ️ These values will be verified by our AI. Please provide accurate information.
                                </p>
                                <div>
                                    <Label htmlFor="claimedArea">Total Area (sq.m)</Label>
                                    <Input
                                        id="claimedArea"
                                        type="number"
                                        value={formData.claimedArea}
                                        onChange={e => updateFormData({ claimedArea: e.target.value })}
                                        placeholder="e.g., 120"
                                        className={errors.claimedArea ? "border-red-500" : ""}
                                    />
                                    {errors.claimedArea && <p className="text-red-500 text-xs mt-1">{errors.claimedArea}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="claimedWidth">Width (meters)</Label>
                                        <Input
                                            id="claimedWidth"
                                            type="number"
                                            value={formData.claimedWidth}
                                            onChange={e => updateFormData({ claimedWidth: e.target.value })}
                                            placeholder="e.g., 10"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="claimedLength">Length (meters)</Label>
                                        <Input
                                            id="claimedLength"
                                            type="number"
                                            value={formData.claimedLength}
                                            onChange={e => updateFormData({ claimedLength: e.target.value })}
                                            placeholder="e.g., 12"
                                        />
                                    </div>
                                </div>
                                {formData.propertyType !== "land" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="bedrooms">Bedrooms</Label>
                                            <Select
                                                value={formData.bedrooms}
                                                onValueChange={v => updateFormData({ bedrooms: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[1, 2, 3, 4, 5, 6].map(n => (
                                                        <SelectItem key={n} value={String(n)}>{n} BHK</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="bathrooms">Bathrooms</Label>
                                            <Select
                                                value={formData.bathrooms}
                                                onValueChange={v => updateFormData({ bathrooms: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[1, 2, 3, 4, 5].map(n => (
                                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 6: Photos */}
                        {currentStep === 6 && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Upload clear photos of your property. These will be analyzed by AI to verify dimensions and detect any structural issues.
                                </p>

                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                        } ${errors.photos ? "border-red-500" : ""}`}
                                >
                                    <input {...getInputProps()} />
                                    <ImagePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="font-medium">Drag & drop photos here</p>
                                    <p className="text-sm text-muted-foreground">or click to browse (max 10 photos)</p>
                                </div>
                                {errors.photos && <p className="text-red-500 text-xs">{errors.photos}</p>}

                                {formData.photos.length > 0 && (
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                        {formData.photos.map((photo, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                                                <img
                                                    src={URL.createObjectURL(photo)}
                                                    alt={`Photo ${idx + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={() => removePhoto(idx)}
                                                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-4 w-4 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 7: Verification Tier */}
                        {currentStep === 7 && (
                            <div className="space-y-6">
                                <TierFeatureHighlights />
                                <TierSelector
                                    selectedTier={formData.verificationTier}
                                    onSelect={tier => updateFormData({ verificationTier: tier })}
                                />
                            </div>
                        )}

                        {/* Step 8: Review & Submit */}
                        {currentStep === 8 && (
                            <div className="space-y-6">
                                {/* Summary */}
                                <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                                    <h4 className="font-semibold">Property Summary</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-muted-foreground">Type:</span> {formData.propertyType}</div>
                                        <div><span className="text-muted-foreground">Listing:</span> For {formData.listingType}</div>
                                        <div><span className="text-muted-foreground">Location:</span> {formData.city}, {formData.state}</div>
                                        <div><span className="text-muted-foreground">Price:</span> ₹{formData.price}</div>
                                        <div><span className="text-muted-foreground">Photos:</span> {formData.photos.length} uploaded</div>
                                        <div><span className="text-muted-foreground">Tier:</span> {formData.verificationTier}</div>
                                    </div>
                                </div>

                                {/* Consents */}
                                <div className="space-y-3">
                                    <TermsConsent
                                        checked={formData.termsConsent}
                                        onChange={v => updateFormData({ termsConsent: v })}
                                        error={errors.termsConsent}
                                    />
                                    <DataAccuracyConsent
                                        checked={formData.dataAccuracyConsent}
                                        onChange={v => updateFormData({ dataAccuracyConsent: v })}
                                        error={errors.dataAccuracyConsent}
                                    />
                                    <AIAnalysisConsent
                                        checked={formData.aiAnalysisConsent}
                                        onChange={v => updateFormData({ aiAnalysisConsent: v })}
                                        error={errors.aiAnalysisConsent}
                                    />

                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>

                    {currentStep < steps.length ? (
                        <Button onClick={nextStep}>
                            Next
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Submit Property
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
