import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerificationTimeline } from "@/components/VerificationTimeline";
import { VerificationBadge } from "@/components/VerificationBadge";
import { DiscrepancySummary } from "@/components/DiscrepancyAlert";
import { PaymentConsent } from "@/components/ConsentCheckbox";
import { toast } from "sonner";
import {
    Loader2, CheckCircle2, AlertTriangle, Calendar, Clock,
    CreditCard, Maximize, Home, MapPin, IndianRupee, RefreshCw,
    Sparkles, FileCheck, Users, ArrowRight, ArrowLeft, Mail, ChevronLeft, ChevronRight
} from "lucide-react";

const API_BASE = "http://localhost:8000";

interface VerificationData {
    property_id: number;
    status: string;
    tier: string;
    ai_complete: boolean;
    document_verified: boolean;
    inspector_assigned: boolean;
    inspection_complete: boolean;
    final_verdict: string | null;
    rejection_reason: string | null;
    payment_status: string;
    payment_amount: number;
    steps_completed: string[];
    next_step: string;
    ai_analysis: {
        estimated_area: number | null;
        room_type: string | null;
        confidence: number | null;
        crack_detected: boolean;
        discrepancy_flag: boolean;
        discrepancy_details: string[];
        detections?: any[];
        gemini_crack_verified?: boolean;
        gemini_crack_is_real?: boolean;
        gemini_crack_description?: string;
        gemini_crack_severity?: string;
        gemini_confidence?: number;
    };
}

interface PropertyData {
    id: number;
    title: string;
    property_type: string;
    listing_type: string;
    city: string;
    state: string;
    claimed_area: number | null;
    price: number;
    photos: string[];
}

export default function VerificationPage() {
    const { propertyId } = useParams<{ propertyId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
    const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentConsent, setPaymentConsent] = useState(false);
    const [inspectionDate, setInspectionDate] = useState("");
    const [inspectionTime, setInspectionTime] = useState("morning");
    const [logs, setLogs] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const fetchStatus = async () => {
        try {
            const [statusRes, propertyRes] = await Promise.all([
                fetch(`${API_BASE}/properties/${propertyId}/status`),
                fetch(`${API_BASE}/properties/${propertyId}`)
            ]);

            if (!statusRes.ok || !propertyRes.ok) throw new Error("Failed to fetch data");

            const statusData = await statusRes.json();
            const propData = await propertyRes.json();

            setVerificationData(statusData);
            setPropertyData(propData);

            // Fetch logs and documents
            const [logsRes, docsRes] = await Promise.all([
                fetch(`${API_BASE}/properties/${propertyId}/logs`),
                fetch(`${API_BASE}/properties/${propertyId}/documents`)
            ]);

            if (logsRes.ok) {
                const logsData = await logsRes.json();
                setLogs(logsData.logs);
            }

            if (docsRes.ok) {
                const docsData = await docsRes.json();
                setDocuments(docsData.documents);
            }
        } catch (error) {
            console.error("Error fetching status:", error);
            toast.error("Failed to load verification status");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (propertyId) {
            fetchStatus();
        }
    }, [propertyId]);

    const triggerAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const res = await fetch(`${API_BASE}/properties/${propertyId}/analyze`, {
                method: "POST"
            });

            if (!res.ok) throw new Error("Analysis failed");

            toast.success("AI analysis complete!");
            await fetchStatus();
        } catch (error) {
            console.error("Analysis error:", error);
            toast.error("Failed to run AI analysis");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const confirmAnalysis = async () => {
        setIsConfirming(true);
        try {
            const formData = new FormData();
            formData.append("user_agrees", "true");

            const res = await fetch(`${API_BASE}/properties/${propertyId}/confirm-analysis`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Confirmation failed");

            toast.success("Analysis confirmed!");
            await fetchStatus();
        } catch (error) {
            console.error("Confirmation error:", error);
            toast.error("Failed to confirm analysis");
        } finally {
            setIsConfirming(false);
        }
    };

    const processPayment = async () => {
        if (!paymentConsent) {
            toast.error("Please agree to the payment terms");
            return;
        }

        setIsProcessingPayment(true);
        try {
            const formData = new FormData();
            formData.append("payment_method", "upi");
            formData.append("payment_reference", `PAY_${Date.now()}`);

            const res = await fetch(`${API_BASE}/properties/${propertyId}/pay`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Payment failed");

            toast.success("Payment successful!");
            await fetchStatus();
        } catch (error) {
            console.error("Payment error:", error);
            toast.error("Payment failed");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const scheduleInspection = async () => {
        if (!inspectionDate) {
            toast.error("Please select an inspection date");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("preferred_date", inspectionDate);
            formData.append("preferred_time", inspectionTime);

            const res = await fetch(`${API_BASE}/properties/${propertyId}/schedule-inspection`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Scheduling failed");

            toast.success("Inspection scheduled!");
            await fetchStatus();
        } catch (error) {
            console.error("Scheduling error:", error);
            toast.error("Failed to schedule inspection");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        if (!e.target.files?.length) return;

        setUploadingDoc(type);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("document_type", type);
        formData.append("files", file);

        try {
            const res = await fetch(`${API_BASE}/properties/${propertyId}/upload-documents`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Upload failed");

            toast.success(`${type.replace("_", " ")} uploaded successfully!`);
            await fetchStatus();
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload document");
        } finally {
            setUploadingDoc(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!verificationData || !propertyData) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-4 py-16 text-center">
                    <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
                    <Button onClick={() => navigate("/list-property")}>List a Property</Button>
                </main>
                <Footer />
            </div>
        );
    }

    const getStatusForBadge = (): "pending" | "verified" | "rejected" | "in_progress" => {
        if (verificationData.status === "verified") return "verified";
        if (verificationData.status === "rejected") return "rejected";
        if (verificationData.status === "pending") return "pending";
        return "in_progress";
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container-main section-spacing">
                <div className="max-w-6xl mx-auto">
                    {/* Header with Back Button */}
                    <div className="mb-8">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-4 pl-0 hover:bg-transparent hover:text-primary"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold mb-2">{propertyData.title}</h1>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <MapPin className="h-4 w-4" />
                                    <span>{propertyData.city}, {propertyData.state}</span>
                                    <span className="mx-2">•</span>
                                    <span className="capitalize">{propertyData.property_type}</span>
                                </div>
                            </div>
                            <VerificationBadge
                                tier={verificationData.tier as any}
                                status={getStatusForBadge()}
                                size="lg"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Timeline */}
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Verification Progress</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <VerificationTimeline
                                        currentStatus={verificationData.status}
                                        tier={verificationData.tier as any}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column - Actions */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Property Summary Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Property Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-3 rounded-lg bg-muted/50">
                                            <IndianRupee className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                            <div className="text-lg font-bold">₹{propertyData.price.toLocaleString()}</div>
                                            <div className="text-xs text-muted-foreground">{propertyData.listing_type === "rent" ? "Monthly" : "Price"}</div>
                                        </div>
                                        {propertyData.claimed_area && (
                                            <div className="text-center p-3 rounded-lg bg-muted/50">
                                                <Maximize className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                                <div className="text-lg font-bold">{propertyData.claimed_area}</div>
                                                <div className="text-xs text-muted-foreground">sq.m (claimed)</div>
                                            </div>
                                        )}
                                        {verificationData.ai_analysis.estimated_area && (
                                            <div className="text-center p-3 rounded-lg bg-emerald-50">
                                                <Sparkles className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                                                <div className="text-lg font-bold text-emerald-700">
                                                    {verificationData.ai_analysis.estimated_area.toFixed(1)}
                                                </div>
                                                <div className="text-xs text-emerald-600">sq.m (AI estimate)</div>
                                            </div>
                                        )}
                                        <div className="text-center p-3 rounded-lg bg-muted/50">
                                            <Home className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                            <div className="text-lg font-bold capitalize">{verificationData.ai_analysis.room_type || "—"}</div>
                                            <div className="text-xs text-muted-foreground">Room Type</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action Cards based on status */}

                            {/* Pending Photos - Trigger Analysis */}
                            {verificationData.status === "pending" && (
                                <Card className="border-primary/30 bg-primary/5">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Sparkles className="h-5 w-5 text-primary" />
                                            Ready for AI Analysis
                                        </CardTitle>
                                        <CardDescription>
                                            Your photos have been uploaded. Start AI analysis to verify property details.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button onClick={triggerAnalysis} disabled={isAnalyzing} className="w-full md:w-auto">
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                    Start AI Analysis
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* AI Analyzing */}
                            {verificationData.status === "ai_analyzing" && (
                                <Card>
                                    <CardContent className="py-8 text-center">
                                        <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                                        <h3 className="text-lg font-semibold mb-2">AI Analysis in Progress</h3>
                                        <p className="text-muted-foreground">
                                            We're analyzing your property photos for area estimation and defect detection.
                                        </p>
                                        <Button variant="outline" onClick={fetchStatus} className="mt-4">
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Refresh Status
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* AI Complete - Show Results */}
                            {verificationData.status === "ai_complete" && (
                                <>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                AI Analysis Complete
                                            </CardTitle>
                                            <CardDescription>
                                                Review the AI findings and confirm to proceed.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* AI Results */}
                                            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Estimated Area</div>
                                                    <div className="text-xl font-bold">
                                                        {verificationData.ai_analysis.estimated_area?.toFixed(1) || "—"} sq.m
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Confidence</div>
                                                    <div className="text-xl font-bold">
                                                        {Math.min(verificationData.ai_analysis.confidence || 0, 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Room Type</div>
                                                    <div className="text-xl font-bold capitalize">
                                                        {verificationData.ai_analysis.room_type || "Unknown"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Cracks Detected</div>
                                                    <div className="text-xl font-bold">
                                                        {verificationData.ai_analysis.crack_detected ? (
                                                            <span className="text-amber-600">Yes</span>
                                                        ) : (
                                                            <span className="text-emerald-600">No</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Visual Evidence with Image Carousel */}
                                            {verificationData.ai_analysis.crack_detected && verificationData.ai_analysis.detections && verificationData.ai_analysis.detections.length > 0 && (
                                                <div className="mb-6">
                                                    <h4 className="text-sm font-semibold mb-3">Defect Visualization</h4>
                                                    <div className="relative rounded-lg overflow-hidden border bg-black/5 aspect-video">
                                                        {propertyData.photos && propertyData.photos.length > 0 && (
                                                            <>
                                                                <img
                                                                    src={propertyData.photos[currentPhotoIndex]?.startsWith('http') ? propertyData.photos[currentPhotoIndex] : `${API_BASE}${propertyData.photos[currentPhotoIndex]}`}
                                                                    alt={`Analysis Photo ${currentPhotoIndex + 1}`}
                                                                    className="object-contain w-full h-full"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                    }}
                                                                />

                                                                {/* Navigation Arrows */}
                                                                {propertyData.photos.length > 1 && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : propertyData.photos.length - 1)}
                                                                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                                                        >
                                                                            <ChevronLeft className="h-5 w-5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setCurrentPhotoIndex(prev => prev < propertyData.photos.length - 1 ? prev + 1 : 0)}
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                                                        >
                                                                            <ChevronRight className="h-5 w-5" />
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {/* Photo Counter & Defect Info */}
                                                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
                                                                    <div className="bg-black/60 text-white px-3 py-1.5 rounded-full text-xs backdrop-blur-sm">
                                                                        {currentPhotoIndex + 1} / {propertyData.photos.length}
                                                                    </div>
                                                                    <div className="bg-amber-500/90 text-white px-3 py-1.5 rounded-full text-xs backdrop-blur-sm font-medium">
                                                                        {verificationData.ai_analysis.detections.filter((d: any) => d.isCrack).length} defects detected
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Gemini AI Crack Analysis */}
                                            {verificationData.ai_analysis.crack_detected && verificationData.ai_analysis.gemini_crack_verified && (
                                                <div className={`p-4 rounded-lg border flex gap-4 ${verificationData.ai_analysis.gemini_crack_is_real ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                                                    <div className={`mt-1 p-2 rounded-full h-fit ${verificationData.ai_analysis.gemini_crack_is_real ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        <Sparkles className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-semibold mb-1 ${verificationData.ai_analysis.gemini_crack_is_real ? 'text-amber-800' : 'text-blue-800'}`}>
                                                            {verificationData.ai_analysis.gemini_crack_is_real ? "Structural Defect Confirmed" : "Likely Decorative / Non-Structural"}
                                                        </h4>
                                                        <p className={`text-sm mb-2 ${verificationData.ai_analysis.gemini_crack_is_real ? 'text-amber-700' : 'text-blue-700'}`}>
                                                            {verificationData.ai_analysis.gemini_crack_description}
                                                        </p>
                                                        <div className="flex items-center gap-4 text-xs font-medium">
                                                            <span className="flex items-center gap-1">
                                                                <span>Trust Score:</span>
                                                                <span className="bg-white/50 px-1.5 py-0.5 rounded border">
                                                                    {Math.round((verificationData.ai_analysis.gemini_confidence || 0) * 100)}%
                                                                </span>
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <span>Severity:</span>
                                                                <span className="uppercase bg-white/50 px-1.5 py-0.5 rounded border">
                                                                    {verificationData.ai_analysis.gemini_crack_severity}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Discrepancies */}
                                            <DiscrepancySummary
                                                discrepancies={verificationData.ai_analysis.discrepancy_details.map(d => ({
                                                    type: "area",
                                                    severity: "medium" as const,
                                                    message: d
                                                }))}
                                            />

                                            <Button onClick={confirmAnalysis} disabled={isConfirming} className="w-full md:w-auto">
                                                {isConfirming ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Confirming...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                        Confirm & Proceed
                                                    </>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </>
                            )}

                            {/* Awaiting Payment - Changed to Email Notification Request */}
                            {verificationData.status === "awaiting_payment" && (
                                <Card className="border-amber-200 bg-amber-50/50">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5 text-amber-600" />
                                            Verification Fee & Payment
                                        </CardTitle>
                                        <CardDescription>
                                            Request the final verification fee details to be sent to your email.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="text-center py-6">
                                            <div className="inline-flex items-center justify-center p-3 bg-amber-100 rounded-full mb-4">
                                                <Mail className="h-6 w-6 text-amber-600" />
                                            </div>
                                            <h4 className="text-lg font-semibold mb-2">Fee Calculation via Email</h4>
                                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                                Instead of a fixed fee, the final amount will be determined based on your property location and size. We will mail you the payment link and details.
                                            </p>
                                        </div>

                                        <PaymentConsent
                                            amount={verificationData.payment_amount || 1000} // Kept for prop-types but logic changed in UI
                                            checked={paymentConsent}
                                            onChange={setPaymentConsent}
                                            label="I agree to receive payment details via email"
                                        />

                                        <Button
                                            onClick={processPayment}
                                            disabled={isProcessingPayment || !paymentConsent}
                                            className="w-full md:w-auto btn-black"
                                        >
                                            {isProcessingPayment ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowRight className="h-4 w-4 mr-2" />
                                                    Request Payment Details
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Admin Review (combines document review + price validation) */}
                            {verificationData.status === "document_review" && (
                                <Card className="border-blue-200 bg-blue-50/30">
                                    <CardContent className="py-8">
                                        <div className="text-center mb-8">
                                            <FileCheck className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                                            <h3 className="text-lg font-semibold mb-2">Document Submission</h3>
                                            <p className="text-muted-foreground">
                                                Please upload the required legal documents to allow us to verify your property.
                                            </p>
                                        </div>

                                        {/* Document Upload Section */}
                                        <div className="bg-white p-6 rounded-xl border border-blue-100 mb-8 shadow-sm">
                                            <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                                                <FileCheck className="h-4 w-4" />
                                                Required Documents
                                            </h4>
                                            <div className="grid gap-4">
                                                {[
                                                    { id: "patta", label: "Patta / Chitta" },
                                                    { id: "sale_deed", label: "Sale Deed" },
                                                    { id: "ec", label: "Encumbrance Certificate (EC)" },
                                                    { id: "tax_receipt", label: "Tax Receipt" }
                                                ].map((doc) => {
                                                    const isUploaded = documents.some(d => d.document_type === doc.id);
                                                    return (
                                                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-full ${isUploaded ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}>
                                                                    {isUploaded ? <CheckCircle2 className="h-4 w-4" /> : <FileCheck className="h-4 w-4" />}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-sm">{doc.label}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {isUploaded ? "Uploaded" : "Required"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                {isUploaded ? (
                                                                    <span className="text-xs font-medium text-green-600 px-2 py-1 bg-green-50 rounded">
                                                                        Received
                                                                    </span>
                                                                ) : (
                                                                    <div className="relative">
                                                                        <input
                                                                            type="file"
                                                                            id={`upload-${doc.id}`}
                                                                            className="hidden"
                                                                            onChange={(e) => handleFileUpload(e, doc.id)}
                                                                            disabled={!!uploadingDoc}
                                                                        />
                                                                        <Label
                                                                            htmlFor={`upload-${doc.id}`}
                                                                            className={`cursor-pointer text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors ${uploadingDoc ? "opacity-50 cursor-not-allowed" : ""}`}
                                                                        >
                                                                            {uploadingDoc === doc.id ? (
                                                                                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                                                                            ) : "Upload"}
                                                                        </Label>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Pending Admin Approval - Separate Section */}
                            {verificationData.status === "pending_admin_approval" && (
                                <Card className="border-purple-200 bg-purple-50/50">
                                    <CardContent className="py-8 text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                                            <Users className="h-8 w-8 text-purple-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-purple-900 mb-2">Under Admin Review</h3>
                                        <p className="text-purple-700 mb-6 max-w-md mx-auto">
                                            Your documents have been received. Our admin team is currently reviewing your property details and legal documents.
                                        </p>

                                        <div className="bg-white p-4 rounded-lg border border-purple-100 text-left max-w-md mx-auto">
                                            <h4 className="font-semibold text-sm text-purple-900 mb-2">Next Steps:</h4>
                                            <ul className="space-y-2 text-sm text-slate-600">
                                                <li className="flex items-start gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5" />
                                                    <span>Document verification (24-48 hrs)</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5" />
                                                    <span>Price validation check</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5" />
                                                    <span>Email notification of status</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Inspector Assigned - Schedule */}
                            {verificationData.status === "inspector_assigned" && (
                                <Card className="border-blue-200 bg-blue-50/50">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-600" />
                                            Schedule Property Inspection
                                        </CardTitle>
                                        <CardDescription>
                                            An inspector has been assigned. Please select a convenient date and time.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="inspection-date">Preferred Date</Label>
                                                <Input
                                                    id="inspection-date"
                                                    type="date"
                                                    value={inspectionDate}
                                                    onChange={e => setInspectionDate(e.target.value)}
                                                    min={new Date().toISOString().split("T")[0]}
                                                />
                                            </div>
                                            <div>
                                                <Label>Preferred Time</Label>
                                                <div className="grid grid-cols-3 gap-2 mt-2">
                                                    {["morning", "afternoon", "evening"].map(time => (
                                                        <button
                                                            key={time}
                                                            onClick={() => setInspectionTime(time)}
                                                            className={`p-2 rounded-lg border text-sm capitalize ${inspectionTime === time
                                                                ? "border-primary bg-primary/10 text-primary"
                                                                : "border-border"
                                                                }`}
                                                        >
                                                            {time}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <Button onClick={scheduleInspection} className="w-full md:w-auto">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Schedule Inspection
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Inspection Scheduled */}
                            {verificationData.status === "inspection_scheduled" && (
                                <Card>
                                    <CardContent className="py-8 text-center">
                                        <Calendar className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                                        <h3 className="text-lg font-semibold mb-2">Inspection Scheduled</h3>
                                        <p className="text-muted-foreground">
                                            Your inspection is scheduled. Please ensure property access on the selected date.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Verified */}
                            {verificationData.status === "verified" && (
                                <Card className="border-accent bg-accent/5">
                                    <CardContent className="py-8 text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                            <CheckCircle2 className="h-8 w-8 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-emerald-700 mb-2">
                                            Property Verified! 🎉
                                        </h3>
                                        <p className="text-emerald-600 mb-6">
                                            Your property is now live on VisionEstate marketplace.
                                        </p>
                                        <Button onClick={() => navigate(`/property/${propertyId}`)}>
                                            View Listing
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Rejected */}
                            {verificationData.status === "rejected" && (
                                <Card className="border-red-200 bg-red-50/50">
                                    <CardContent className="py-8 text-center">
                                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                                        <h3 className="text-lg font-semibold text-red-700 mb-2">Verification Failed</h3>
                                        <p className="text-red-600 mb-4">
                                            {verificationData.rejection_reason || "Your property did not pass verification."}
                                        </p>
                                        <Button variant="outline" onClick={() => navigate("/list-property")}>
                                            Submit New Property
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Activity Log */}
                            {logs.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Clock className="h-5 w-5" />
                                            Activity History
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                            {logs.map((log, index) => (
                                                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                        <Clock className="h-4 w-4 text-slate-500" />
                                                    </div>
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                                                        <div className="flex items-center justify-between space-x-2 mb-1">
                                                            <div className="font-bold text-slate-900">{log.description}</div>
                                                            <time className="font-caveat font-medium text-indigo-500 text-xs">
                                                                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </time>
                                                        </div>
                                                        <div className="text-slate-500 text-sm">
                                                            Performed by: <span className="font-medium text-slate-700 capitalize">{log.performed_by}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
