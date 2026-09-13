import os
import re
import uuid
import shutil
from fastapi import UploadFile, HTTPException, status
from app.config import settings

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

class StorageService:
    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = base_dir

    def save_file(self, file: UploadFile, subfolder: str = "general") -> dict:
        folder_path = os.path.join(self.base_dir, subfolder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Sanitize original filename to prevent path traversal attacks
        raw_name = os.path.basename(file.filename or "uploaded_document.pdf")
        clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', raw_name)
        unique_filename = f"{uuid.uuid4().hex[:12]}_{clean_name}"
        destination_path = os.path.join(folder_path, unique_filename)
        
        # Save file securely with magic byte and size checks
        bytes_written = 0
        header = b""
        with open(destination_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 64):
                if len(header) < 5:
                    header += chunk[:5 - len(header)]
                bytes_written += len(chunk)
                if bytes_written > MAX_FILE_SIZE_BYTES:
                    buffer.close()
                    if os.path.exists(destination_path):
                        os.remove(destination_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File exceeds maximum allowed size limit of 25MB."
                    )
                buffer.write(chunk)
                
        # Validate PDF magic bytes for pdf uploads
        if clean_name.lower().endswith(".pdf") and not header.startswith(b"%PDF"):
            if os.path.exists(destination_path):
                os.remove(destination_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file content: The file is not a valid PDF document."
            )
            
        return {
            "filename": clean_name,
            "saved_name": unique_filename,
            "path": destination_path,
            "size": bytes_written
        }

    def get_file_path(self, relative_path: str) -> str:
        return os.path.abspath(relative_path)

storage_service = StorageService()
