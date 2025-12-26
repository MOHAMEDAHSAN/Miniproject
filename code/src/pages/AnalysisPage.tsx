import { useState, useCallback, Suspense, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  Upload, Loader2, Ruler, Home, ShieldCheck, AlertTriangle,
  Box as BoxIcon, Search, Maximize2, MoveVertical, Zap,
  BedDouble, Sofa, ChefHat, Bath, Briefcase, Check, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box, Grid, ContactShadows } from "@react-three/drei";

type Unit = 'm' | 'ft';

// Room type icons mapping
const ROOM_ICONS: Record<string, any> = {
  "Bedroom": BedDouble,
  "Living Room": Sofa,
  "Kitchen": ChefHat,
  "Bathroom": Bath,
  "Office": Briefcase,
};

// --- Room Rendering Component ---
const Room3D = ({ dims }: { dims: any }) => (
  <Canvas camera={{ position: [7, 7, 7], fov: 45 }}>
    <ambientLight intensity={0.6} />
    <pointLight position={[10, 10, 10]} />
    <Suspense fallback={null}>
      <group position={[0, dims.height / 2, 0]}>
        <Box args={[dims.width, dims.height, dims.length]}>
          <meshStandardMaterial color="#3b82f6" wireframe transparent opacity={0.6} />
        </Box>
        <Box args={[dims.width, 0.05, dims.length]} position={[0, -dims.height / 2, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
      </group>
      <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={20} blur={2} />
      <Grid infiniteGrid fadeDistance={40} sectionSize={1} />
    </Suspense>
    <OrbitControls makeDefault />
  </Canvas>
);

// --- Confidence Indicator Component ---
const ConfidenceIndicator = ({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) => {
  const getColor = () => {
    if (value >= 70) return "bg-emerald-500";
    if (value >= 40) return "bg-amber-500";
    return "bg-red-500";
  };
  
  const getTextColor = () => {
    if (value >= 70) return "text-emerald-600";
    if (value >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const sizeClasses = {
    sm: "h-1.5 text-xs",
    md: "h-2 text-sm",
    lg: "h-3 text-base"
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${sizeClasses[size].split(' ')[0]}`}>
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className={`${sizeClasses[size].split(' ')[1]} font-bold ${getTextColor()}`}>
        {value.toFixed(0)}% confidence
      </span>
    </div>
  );
};

// --- Room Type Badge Component ---
const RoomTypeBadge = ({ roomType, confidence }: { roomType: string; confidence: number }) => {
  const Icon = ROOM_ICONS[roomType] || Home;
  
  return (
    <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Detected Room</p>
        <p className="text-white text-xl font-bold">{roomType}</p>
      </div>
      <div className="ml-4 px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">
        <span className="text-white font-bold">{confidence.toFixed(0)}%</span>
      </div>
    </div>
  );
};

// --- User Correction Modal ---
const UserCorrectionPanel = ({ 
  currentRoomType, 
  onCorrect, 
  onConfirm 
}: { 
  currentRoomType: string; 
  onCorrect: (type: string, size: string) => void;
  onConfirm: () => void;
}) => {
  const [selectedType, setSelectedType] = useState(currentRoomType);
  const [selectedSize, setSelectedSize] = useState<string>("medium");
  
  const roomTypes = ["Bedroom", "Living Room", "Kitchen", "Bathroom", "Office"];
  const sizes = [
    { key: "small", label: "Small", desc: "< 12 m²" },
    { key: "medium", label: "Medium", desc: "12-20 m²" },
    { key: "large", label: "Large", desc: "> 20 m²" }
  ];

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-8 shadow-xl animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Low Confidence Detection</h3>
          <p className="text-sm text-slate-600">Help us improve the estimate</p>
        </div>
      </div>
      
      {/* Room Type Selection */}
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-700 mb-3">What type of room is this?</p>
        <div className="flex flex-wrap gap-2">
          {roomTypes.map((type) => {
            const Icon = ROOM_ICONS[type] || Home;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all font-medium ${
                  selectedType === type 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-105" 
                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {type}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Size Selection */}
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-700 mb-3">Approximate room size?</p>
        <div className="grid grid-cols-3 gap-3">
          {sizes.map((size) => (
            <button
              key={size.key}
              onClick={() => setSelectedSize(size.key)}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                selectedSize === size.key
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                  : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
              }`}
            >
              <p className="font-bold">{size.label}</p>
              <p className={`text-xs ${selectedSize === size.key ? "text-blue-100" : "text-slate-500"}`}>
                {size.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button 
          onClick={() => onCorrect(selectedType, selectedSize)}
          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Update Estimate
        </Button>
        <Button 
          variant="outline"
          onClick={onConfirm}
          className="flex-1 h-12 rounded-xl font-bold border-2"
        >
          <Check className="w-4 h-4 mr-2" />
          Keep Current
        </Button>
      </div>
    </div>
  );
};

const AnalysisPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [unit, setUnit] = useState<Unit>('m');
  const [showCorrection, setShowCorrection] = useState(false);
  const [userCorrected, setUserCorrected] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    toast.success(`${acceptedFiles.length} images added to session`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'image/*': []} });

  const handleStartAnalysis = async () => {
    if (files.length === 0) return toast.error("Upload at least one perspective");
    setIsAnalyzing(true);
    setShowCorrection(false);
    setUserCorrected(false);
    
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));

    try {
      const response = await fetch("http://127.0.0.1:8000/reconstruct-room", { method: "POST", body: formData });
      const data = await response.json();
      
      const fileData = files.map(f => ({
        url: URL.createObjectURL(f),
        name: f.name
      }));
      
      setResults({ ...data, filePreviews: fileData });
      
      // Show correction panel if confidence is low
      if (data.needs_user_confirmation) {
        setShowCorrection(true);
        toast.warning("Low confidence - please verify the detection");
      } else {
        toast.success("Analysis complete with high confidence!");
      }
    } catch (e) {
      toast.error("Connection Failed - Make sure backend is running");
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const handleUserCorrection = (roomType: string, size: string) => {
    if (!results) return;
    
    // Average room sizes by type and size
    const ROOM_SIZES: Record<string, Record<string, number>> = {
      "Bedroom": { small: 9, medium: 14, large: 20 },
      "Living Room": { small: 15, medium: 22, large: 35 },
      "Kitchen": { small: 8, medium: 12, large: 18 },
      "Bathroom": { small: 4, medium: 6, large: 10 },
      "Office": { small: 9, medium: 14, large: 20 },
    };
    
    const newArea = ROOM_SIZES[roomType]?.[size] || 14;
    const side = Math.sqrt(newArea);
    
    setResults({
      ...results,
      room_type: roomType,
      room_confidence: 95, // User-corrected = high confidence
      overall_confidence: 95,
      spatial_data: {
        ...results.spatial_data,
        area: newArea,
        width: parseFloat((side * 1.1).toFixed(2)),
        length: parseFloat((side * 0.9).toFixed(2)),
        area_confidence: 95,
        estimation_method: "user_corrected"
      }
    });
    
    setShowCorrection(false);
    setUserCorrected(true);
    toast.success("Estimate updated based on your input!");
  };

  const convert = (m: number) => {
    if (unit === 'ft') return m * 3.28084;
    return m;
  };

  const formattedResults = useMemo(() => {
    if (!results) return null;
    const { width, height, length, area } = results.spatial_data;
    const areaUnit = unit === 'm' ? 'm²' : 'ft²';
    const convArea = unit === 'm' ? area : (area * 10.7639);
    
    return {
      w: `${convert(width).toFixed(2)} ${unit}`,
      h: `${convert(height).toFixed(2)} ${unit}`,
      l: `${convert(length).toFixed(2)} ${unit}`,
      area: `${convArea.toFixed(1)} ${areaUnit}`,
      areaRaw: convArea
    };
  }, [results, unit]);

  const clearSession = () => {
    setFiles([]);
    setResults(null);
    setShowCorrection(false);
    setUserCorrected(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Navbar />
      <main className="flex-grow pt-28 pb-12 container mx-auto px-4">
        
        {/* Header Section */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            AI-Powered Room Analysis
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">
            VisionEstate <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Spatial Engine</span>
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Upload room photos to detect room type, estimate floor area, and identify structural features using advanced AI models.
          </p>
          
          {/* Upload Zone */}
          <div 
            {...getRootProps()} 
            className={`mt-10 p-16 border-2 border-dashed rounded-[2rem] transition-all duration-300 cursor-pointer 
              bg-white/70 backdrop-blur-sm hover:border-blue-400 hover:bg-blue-50/50 shadow-xl hover:shadow-2xl
              ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-200'}`}
          >
            <input {...getInputProps()} />
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              <Upload className="text-blue-600" size={32} />
            </div>
            <p className="font-bold text-xl text-slate-800 mb-2">Drop room images here</p>
            <p className="text-slate-500">or click to browse • Supports JPG, PNG</p>
          </div>
          
          {/* File Count & Actions */}
          {files.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <div className="px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-medium">
                {files.length} image{files.length > 1 ? 's' : ''} selected
              </div>
              <Button 
                onClick={handleStartAnalysis} 
                disabled={isAnalyzing} 
                size="lg" 
                className="rounded-xl px-8 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl font-bold text-lg"
              >
                {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
                {isAnalyzing ? "Analyzing..." : "Start Analysis"}
              </Button>
              <Button variant="outline" onClick={clearSession} className="rounded-xl h-14">
                Clear All
              </Button>
            </div>
          )}
        </div>

        {/* Results Section */}
        {results && formattedResults && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            
            {/* Room Type & Confidence Summary */}
            <section className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-white rounded-3xl shadow-xl border">
                <RoomTypeBadge 
                  roomType={results.room_type} 
                  confidence={results.room_confidence} 
                />
                
                <div className="flex-1 max-w-xs">
                  <p className="text-sm font-medium text-slate-600 mb-2">Overall Confidence</p>
                  <ConfidenceIndicator value={results.overall_confidence} size="lg" />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Estimation Method</p>
                  <span className={`inline-block px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide ${
                    results.spatial_data.estimation_method?.includes('a4') 
                      ? 'bg-green-100 text-green-700' 
                      : results.spatial_data.estimation_method?.includes('reference')
                        ? 'bg-blue-100 text-blue-700'
                        : results.spatial_data.estimation_method?.includes('user')
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-amber-100 text-amber-700'
                  }`}>
                    {results.spatial_data.estimation_method?.replace(/_/g, ' ') || 'Estimated'}
                  </span>
                </div>
              </div>
            </section>

            {/* User Correction Panel (if needed) */}
            {showCorrection && !userCorrected && (
              <section className="max-w-2xl mx-auto">
                <UserCorrectionPanel 
                  currentRoomType={results.room_type}
                  onCorrect={handleUserCorrection}
                  onConfirm={() => setShowCorrection(false)}
                />
              </section>
            )}

            {/* Large Area Display Card */}
            <section className="max-w-4xl mx-auto">
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-[2.5rem] p-10 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">Estimated Floor Area</p>
                      <h2 className="text-6xl font-black tracking-tight">{formattedResults.area}</h2>
                    </div>
                    
                    {/* Unit Toggle */}
                    <div className="flex bg-white/20 backdrop-blur-sm rounded-xl p-1">
                      {(['m', 'ft'] as Unit[]).map((u) => (
                        <button 
                          key={u} 
                          onClick={() => setUnit(u)} 
                          className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                            unit === u 
                              ? 'bg-white text-blue-600 shadow-lg' 
                              : 'text-white/80 hover:text-white'
                          }`}
                        >
                          {u === 'm' ? 'm²' : 'ft²'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Dimension Pills */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { icon: Ruler, label: "Width", value: formattedResults.w },
                      { icon: Maximize2, label: "Length", value: formattedResults.l },
                      { icon: MoveVertical, label: "Height", value: formattedResults.h },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3">
                        <Icon className="w-5 h-5 text-blue-200" />
                        <div>
                          <p className="text-blue-200 text-xs font-medium">{label}</p>
                          <p className="font-bold text-lg">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Reference Object Badge */}
                  {results.spatial_data.reference_object && (
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-sm">
                      <BoxIcon className="w-4 h-4" />
                      <span>Scale reference: <strong className="capitalize">{results.spatial_data.reference_object}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Feature Analysis Gallery */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                <Search className="text-blue-600" size={24} /> Feature Analysis Gallery
              </h2>
              <div className="grid grid-cols-1 gap-12 max-w-5xl mx-auto">
                {results.filePreviews.map((preview: any, idx: number) => {
                  const imgData = results.analysis_results[idx];
                  return (
                    <div key={idx} className="bg-white rounded-[2.5rem] overflow-hidden border shadow-xl">
                      <div className="relative w-full bg-slate-100 flex justify-center items-center overflow-hidden" style={{ minHeight: '500px', maxHeight: '75vh' }}>
                        <div className="relative inline-block">
                          <img 
                            src={preview.url} 
                            className="block h-auto max-w-full object-contain" 
                            alt="Perspective Analysis"
                          />

                          {/* Bounding Box Overlay Layer */}
                          <div className="absolute inset-0 pointer-events-none">
                            {imgData?.detections?.filter((d: any) => d.bbox).map((det: any, i: number) => {
                              const [x, y, w, h] = det.bbox;
                              const [imgH, imgW] = imgData.img_size;

                              let boxStyle = "border-blue-500 bg-blue-500/10";
                              if (det.isCalibration) boxStyle = "border-yellow-400 bg-yellow-400/30";
                              if (det.isCrack) boxStyle = "border-red-500 bg-red-500/20";

                              return (
                                <div key={i} className={`absolute border-2 rounded-sm ${boxStyle}`}
                                  style={{
                                    left: `${(x / imgW) * 100}%`,
                                    top: `${(y / imgH) * 100}%`,
                                    width: `${(w / imgW) * 100}%`,
                                    height: `${(h / imgH) * 100}%`
                                  }}>
                                  <span className="absolute -top-5 left-0 text-[9px] font-bold bg-white/95 px-2 py-0.5 rounded text-slate-900 uppercase shadow-sm whitespace-nowrap">
                                    {det.label} {det.confidence ? `${(det.confidence * 100).toFixed(0)}%` : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="p-6 border-t flex justify-between items-center bg-white">
                         <span className="text-xs text-slate-400 font-mono font-bold uppercase">{preview.name}</span>
                         <div className="flex gap-3">
                           {imgData?.detections?.some((d: any) => d.isCalibration) && (
                             <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-200">
                               <ShieldCheck size={14} />
                               <span className="text-xs font-bold uppercase">A4 Scale Reference</span>
                             </div>
                           )}
                           {imgData?.detections?.some((d: any) => d.isCrack) && (
                             <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200">
                               <AlertTriangle size={14} />
                               <span className="text-xs font-bold uppercase">Cracks Detected</span>
                             </div>
                           )}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3D Visualization */}
            <section className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                <BoxIcon className="text-blue-600" size={24} /> 3D Room Preview
              </h2>
              <div className="bg-slate-900 rounded-[3rem] h-[500px] overflow-hidden border-[8px] border-white shadow-2xl">
                <Room3D dims={results.spatial_data} />
              </div>
              <p className="text-center text-slate-500 text-sm mt-4">
                Drag to rotate • Scroll to zoom • Based on estimated dimensions
              </p>
            </section>

          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AnalysisPage;