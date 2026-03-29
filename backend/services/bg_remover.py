"""
Background Removal Service using rembg (local, free)
Install: pip install rembg[gpu] or pip install rembg
"""
import io
import asyncio
import logging
from PIL import Image

logger = logging.getLogger(__name__)

try:
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    logger.warning("rembg not installed. Background removal will not work. Install with: pip install rembg")


def _sync_remove_background(image_bytes: bytes) -> bytes:
    """동기 배경 제거 (스레드풀에서 실행용)"""
    input_image = Image.open(io.BytesIO(image_bytes))
    output_image = remove(input_image)
    output_buffer = io.BytesIO()
    output_image.save(output_buffer, format="PNG")
    output_buffer.seek(0)
    return output_buffer.getvalue()


async def remove_background(image_bytes: bytes) -> bytes:
    """Remove background from image bytes, return PNG bytes with transparent background."""
    if not REMBG_AVAILABLE:
        raise RuntimeError("rembg is not installed. Run: pip install rembg")
    
    try:
        # CPU 집약적 작업을 스레드풀에서 실행하여 이벤트 루프 블로킹 방지
        result = await asyncio.to_thread(_sync_remove_background, image_bytes)
        return result
    except Exception as e:
        logger.error(f"Background removal failed: {e}")
        raise
