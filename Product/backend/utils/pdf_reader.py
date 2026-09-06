"""
📄 PDF → text extraction for the "Fine View" dyslexia-friendly reader.

Strategy (fast + accurate):
  1. Try the PDF's embedded text layer first (instant, perfectly accurate for
     digital PDFs).
  2. If a page has little/no text (scanned image PDF), render it and run EasyOCR.

The extracted text is also written to a temp file so it can be re-served/cached.
"""
import os
import tempfile

import fitz  # PyMuPDF
import numpy as np


def extract_pdf_text(pdf_bytes: bytes, max_pages: int = 15) -> dict:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = min(len(doc), max_pages)

    pages_text = []
    used_ocr = False

    for i in range(page_count):
        page = doc[i]
        text = page.get_text("text").strip()

        # Sparse text → almost certainly a scanned/image page → OCR it.
        if len(text) < 20:
            try:
                from utils.ocr_service import get_reader

                pix = page.get_pixmap(dpi=150)
                img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                    pix.height, pix.width, pix.n
                )
                if pix.n == 4:  # drop alpha for OpenCV/EasyOCR
                    img = img[:, :, :3]

                ocr_lines = get_reader().readtext(img, detail=0, paragraph=True)
                text = "\n".join(ocr_lines).strip()
                used_ocr = True
            except Exception as e:
                print(f"⚠️ OCR fallback failed on page {i}: {e}")

        if text:
            pages_text.append(text)

    doc.close()
    full_text = "\n\n".join(pages_text).strip()

    # Persist to a temp .txt (handy for caching / re-download).
    tmp = tempfile.NamedTemporaryFile(
        prefix="mentis_ocr_", suffix=".txt", delete=False, mode="w", encoding="utf-8"
    )
    tmp.write(full_text)
    tmp.close()

    return {
        "text": full_text,
        "pages": page_count,
        "used_ocr": used_ocr,
        "char_count": len(full_text),
        "temp_path": os.path.basename(tmp.name),  # don't leak full server path
    }
