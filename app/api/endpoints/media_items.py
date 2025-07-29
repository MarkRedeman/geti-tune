import json
import logging
import os
from pathlib import Path
from typing import Annotated

from app.utils.annotations import Annotation
import anyio
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from PIL import Image
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/data-collection")


# Path to the folder containing the media items
cur_dir = Path(__file__).parent
MEDIA_FOLDER = cur_dir / "../../../data/output"


class Predictions(BaseModel):
    annotations: list[Annotation]


class MediaItem(BaseModel):
    image: str
    prediction: str
    text_content: str
    predictions: Predictions
    width: int
    height: int
    aspect_ratio: float


class PaginatedResponse(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    items: list[MediaItem]


def get_image_dimensions(image_path: str) -> dict[str, float]:
    """Get the dimensions and aspect ratio of an image."""
    with Image.open(image_path) as img:
        width, height = img.size
        aspect_ratio = width / height
    return {"width": width, "height": height, "aspect_ratio": aspect_ratio}


def get_media_items() -> list[dict]:
    """Retrieve all media items from the folder."""
    media_items = {}
    for filename in sorted(os.listdir(MEDIA_FOLDER), reverse=True):
        if filename.endswith("-original.jpg"):
            prefix = filename.split("-original.jpg")[0]
            image_path = os.path.join(MEDIA_FOLDER, f"{prefix}-original.jpg")
            dimensions = get_image_dimensions(image_path)
            media_items[prefix] = {
                "image": f"{prefix}",
                "prediction": f"{prefix}-pred.jpg",
                "text": os.path.join(MEDIA_FOLDER, f"{prefix}-pred.txt"),
                **dimensions,
            }
    return list(media_items.values())


def count_media_items() -> int:
    """Count the total number of media items in the folder."""
    return sum(1 for filename in os.listdir(MEDIA_FOLDER) if filename.endswith("-original.jpg"))


@router.get("")
async def list_media_items(
    page: Annotated[int, Query(ge=1, description="Page number to retrieve")] = 1,
    page_size: Annotated[int, Query(ge=1, description="Number of items per page")] = 1500,
) -> PaginatedResponse:
    """List media items with pagination."""
    media_items = get_media_items()
    total_items = count_media_items()
    total_pages = (total_items + page_size - 1) // page_size

    if page > total_pages:
        raise HTTPException(status_code=404, detail="Page not found")

    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    paginated_items = media_items[start_index:end_index]

    # # Read the contents of the text files
    # for item in paginated_items:
    #     item["text_content"] = "test"
    #     async with await anyio.open_file(item["text"]) as file:
    #         item["text_content"] = await file.read()

    # Read the contents of the JSON files and add as 'json_content' to each item
    for item in paginated_items:
        prefix = item["image"]
        json_path = os.path.join(MEDIA_FOLDER, f"{prefix}-pred.json")

        item["predictions"] = None
        if os.path.exists(json_path):
            try:
                async with await anyio.open_file(json_path) as file:
                    content = await file.read()
                    item["predictions"] = json.loads(content)
            except Exception as e:
                logger.warning(f"Could not read or parse {json_path}: {e}")
                item["predictions"] = None

        # For compatibility, you may want to keep the old text_content for now
        item["text_content"] = "test"
        if os.path.exists(item["text"]):
            try:
                async with await anyio.open_file(item["text"]) as file:
                    item["text_content"] = await file.read()
            except Exception as e:
                logger.warning(f"Could not read {item['text']}: {e}")
                item["text_content"] = None

    return PaginatedResponse(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        items=[MediaItem(**item) for item in paginated_items],
    )


@router.get("/{media_id}/image", response_class=FileResponse)
async def get_media_image(
    media_id: Annotated[str, Path(description="The ID of the media item")],
) -> FileResponse:
    """Return the image contents of the specified media item."""
    image_path = os.path.join(MEDIA_FOLDER, f"{media_id}-original.jpg")

    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(image_path)


@router.get("/{media_id}/prediction", response_class=FileResponse)
async def get_media_prediction(
    media_id: Annotated[str, Path(description="The ID of the media item")],
) -> FileResponse:
    """Return the image contents of the specified media item."""
    image_path = os.path.join(MEDIA_FOLDER, f"{media_id}-pred.jpg")

    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(image_path)


@router.get("/{media_id}/prediction-thumbnail", response_class=FileResponse)
async def get_resized_media_prediction_image(
    media_id: Annotated[str, Path(description="The ID of the media item")],
) -> FileResponse:
    """Return the resized image contents of the specified media item."""
    image_path = os.path.join(MEDIA_FOLDER, f"{media_id}-pred.jpg")
    resized_path = os.path.join(MEDIA_FOLDER, f"{media_id}-resized.jpg")

    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    if not os.path.exists(resized_path):
        with Image.open(image_path) as img:
            # Calculate the new size while maintaining the aspect ratio
            img.thumbnail((300, 300), Image.LANCZOS)
            img.save(resized_path)

    return FileResponse(resized_path)


@router.get("/{media_id}/image-thumbnail", response_class=FileResponse)
async def get_resized_media_image(
    media_id: Annotated[str, Path(description="The ID of the media item")],
) -> FileResponse:
    """Return the resized image contents of the specified media item."""
    image_path = os.path.join(MEDIA_FOLDER, f"{media_id}-original.jpg")
    resized_path = os.path.join(MEDIA_FOLDER, f"{media_id}-image-resized.jpg")

    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    if not os.path.exists(resized_path):
        with Image.open(image_path) as img:
            # Calculate the new size while maintaining the aspect ratio
            img.thumbnail((300, 300), Image.LANCZOS)
            img.save(resized_path)

    return FileResponse(resized_path)
