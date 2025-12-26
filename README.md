

## Vision Estate: AI-Powered Real Estate Analyzer

Vision Estate is an AI-powered verification and analysis engine designed to automate property validation by eliminating the dependency on subjective, self-reported data. By integrating state-of-the-art computer vision and deep learning, the platform transforms raw property media into a structured, machine-readable inventory of physical and legal attributes.

## About

Vision Estate addresses the critical "trust gap" found in current real estate platforms where key details like floor area, property condition, and legal ownership are often unverified. This project proposes an automated solution that uses deep learning to process user-uploaded data, removing the need for high-friction manual inspections. The system leverages (1) ML-assisted document processing for ownership verification, (2) 3D reconstruction and spatial calibration for area estimation, and (3) computer vision-based quality analysis to detect structural flaws. The goal is to democratize trust in the real estate market by providing a transparent, data-driven assessment layer for all stakeholders.

## Features

* **Structural Health Monitoring:** Uses a specialized YOLOv8 model (`crack.pt`) to identify and localize defects such as wall cracks or water stains with high precision.


* **Automated Area Estimation:** Calculates floor area and room dimensions by detecting standard reference objects (like A4 paper) to establish a "Meters-per-Pixel" scale.


* **3D Spatial Understanding:** Integrates MiDaS depth estimation and SegFormer-based floor segmentation to generate 3D spatial understanding and volume of rooms.


* **Legal Document Verification:** Utilizes OCR and Named Entity Recognition (NER) to extract and cross-validate legal entities like Owner Name and Property ID from deeds.


* **Trust Scoring:** Automatically flags discrepancies if the AI-estimated area differs significantly from the user's claimed area (e.g., >15% difference).



## Requirements

* **Operating System:** Windows 10/11, macOS, or Linux (Ubuntu 20.04+).


* **Hardware:** Intel Core i5/i7 or AMD Ryzen 5 processor; 8 GB RAM minimum (16 GB recommended).


* **GPU:** NVIDIA GeForce GTX 1650 or higher for CUDA acceleration and model training.


* **Development Environment:** Python 3.9+ and Node.js (for React frontend).


* **Deep Learning Frameworks:** Ultralytics (YOLOv8) for object/crack detection, PyTorch for MiDaS and SegFormer models.


* **Image Processing:** OpenCV for bilateral filtering, adaptive thresholding, and geometric contour analysis.


* **Backend:** FastAPI with Pydantic for data validation and uvicorn for asynchronous serving.



## System Architecture

The system follows a modern, scalable microservice architecture where high-resolution images are processed through specialized pipelines for feature extraction and spatial analysis.

## Training and Model Optimization

The core intelligence for crack detection was developed using a custom dataset of building material variations and environmental contexts.

* **Training Environment:** [Google Colab - VisionEstate Training](https://colab.research.google.com/drive/14L0KdbrHlrlsOT3INzAW_K1ecGFnFRgs?usp=sharing)

* **Process:** The model was trained using YOLOv8, monitored via loss curves, and the best-performing weights were exported as `crack.pt` for deployment.



## Execution Instructions

You will need **two separate terminals** to run the full application.

### 1. Backend Server (FastAPI)

Navigate to the backend folder, install the necessary dependencies, and start the server:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

```

* **Interactive API Docs:** Once the backend is running, you can view all endpoints and test them at **`http://localhost:8000/docs`**.

### 2. Frontend Application (React)

Open a second terminal to run the development server for the marketplace:

```bash
npm run dev

```

### 3. Admin Access

To access the admin dashboard to approve properties or view detailed verification metrics:

* **URL Route:** `/admin`
* **Admin Email:** `jaisurya1801@gmail.com`
* **Admin Password:** `Ypyq7jvcl@1`

## Output

#### Output 1 - Feature Analysis Gallery

The gallery displays uploaded images with real-time bounding box overlays identifying amenities and structural defects.

#### Output 2 - Spatial Estimation & 3D Visualization

The spatial engine provides precise measurements (Width, Height, Length) and a 3D wireframe reconstruction of the room.

## Results and Impact

Vision Estate effectively replaces subjective seller descriptions with machine-readable data. By automating the verification of legal deeds and physical dimensions, the project reduces the risk of fraud and financial loss for buyers. The integration of computer vision ensures that property health is graded objectively, setting a new standard for transparency in digital real estate marketplaces.

## Articles published / References

1. Law et al. (2019): "CNN-based building defect detection using VGG-16 and Class Activation Mapping." 


2. Choi et al. (2024): "Comparison of Mask R-CNN vs YOLOv8 for Concrete crack images." 


3. Wang et al. (2023): "SfM-MVS pipeline with semantic segmentation for 3D property inspection." 


4. Jocher, G., et al. (2024). "Ultralytics YOLOv8: Real-time Object Detection and Predictive Analytics." 


5. Anand, S., & Gupta, R. (2025). "Automated Verification of Real Estate Titles using OCR and Named Entity Recognition." 


