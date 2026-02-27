from fastapi import APIRouter, File, UploadFile, HTTPException, Request
import shutil
import os
from pathlib import Path

router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)

# Relative path to the frontend public folder from this backend file
# backend/app/routes/upload.py -> backend/app/routes -> backend/app -> backend -> ROOT -> public
# So it is ../../../public
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
PUBLIC_DIR = BASE_DIR / "public"

import fitz # PyMuPDF

@router.post("/template-image")
async def upload_template_image(request: Request, file: UploadFile = File(...)):
    """
    Uploads a JPG/PNG template image directly to the frontend's public folder.
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image (JPG/PNG)")

        # Ensure public directory exists
        if not os.path.exists(PUBLIC_DIR):
             raise HTTPException(status_code=500, detail=f"Public directory not found at {PUBLIC_DIR}")

        file_path = PUBLIC_DIR / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        base_url = str(request.base_url).rstrip("/")
        return {"filename": file.filename, "path": str(file_path), "status": "success", "url": f"{base_url}/{file.filename}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/template-pdf")
async def upload_template_pdf(request: Request, file: UploadFile = File(...)):
    """
    Uploads a PDF template:
    1. Saves the original PDF to public folder (for pdf-lib to use)
    2. Converts first page to JPG as fallback
    3. Returns the URL as root-relative path for frontend
    """
    try:
        if not file.content_type == "application/pdf":
            raise HTTPException(status_code=400, detail="File must be a PDF")

        if not os.path.exists(PUBLIC_DIR):
             raise HTTPException(status_code=500, detail=f"Public directory not found at {PUBLIC_DIR}")

        # Sanitize filename
        safe_name = file.filename.replace(" ", "_")
        
        # 1. Save original PDF to public folder (frontend can fetch it directly)
        pdf_path = PUBLIC_DIR / safe_name
        contents = await file.read()
        with open(pdf_path, "wb") as buffer:
            buffer.write(contents)
            
        # 2. Also convert first page to JPG as fallback
        doc = fitz.open(pdf_path)
        page = doc.load_page(0)
        pix = page.get_pixmap(dpi=300)
        
        image_filename = f"{safe_name}.jpg"
        image_path = PUBLIC_DIR / image_filename
        pix.save(image_path)
        doc.close()
        
        # 3. Return root-relative URL (Vite serves /public/ as /)
        # Use the original PDF so pdf-lib can extract all pages
        return {
            "filename": safe_name, 
            "url": f"/{safe_name}",  # Root-relative for frontend
            "image_url": f"/{image_filename}",
            "status": "success"
        }

    except Exception as e:
        print(f"Error processing template: {e}")
        raise HTTPException(status_code=500, detail=str(e))
