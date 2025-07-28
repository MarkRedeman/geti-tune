import dataclasses
import json
import logging
import os
from datetime import datetime

import cv2
import numpy as np
from model_api.models.result import Result

from app.schemas.configuration import OutputFormat
from app.schemas.configuration.output_config import FolderOutputConfig
from app.services.dispatchers.base import BaseDispatcher
from app.utils.annotations import Roi, ToAnnotation, serialize_annotation

logger = logging.getLogger(__name__)


class FolderDispatcher(BaseDispatcher):
    """FolderDispatcher allows outputting to a folder in the local filesystem."""

    def __init__(self, output_config: FolderOutputConfig) -> None:
        """
        Initialize the FolderDispatcher.
        Args:
            output_config: Configuration for the output destination
        """
        super().__init__(output_config=output_config)
        self.output_folder = output_config.folder_path
        if not os.path.exists(self.output_folder):
            os.makedirs(self.output_folder, exist_ok=True)

    @staticmethod
    def _write_image_to_file(image: np.ndarray, file_path: str) -> None:
        with open(file_path, "wb") as f:
            success, img_buf = cv2.imencode(".png", image)
            if success:
                f.write(img_buf.tobytes())
            else:
                logger.error(f"Failed to encode image for {file_path}")

    @staticmethod
    def _write_predictions_to_file(predictions: str, file_path: str) -> None:
        with open(file_path, "w") as f:
            f.write(predictions)

    def _dispatch(
        self,
        original_image: np.ndarray,
        image_with_visualization: np.ndarray,
        predictions: Result,
    ) -> None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # up to milliseconds
        image_orig_file = os.path.join(self.output_folder, f"{timestamp}-original.jpg")
        image_viz_file = os.path.join(self.output_folder, f"{timestamp}-pred.jpg")
        pred_txt_file = os.path.join(self.output_folder, f"{timestamp}-pred.txt")
        pred_json_file = os.path.join(self.output_folder, f"{timestamp}-pred.json")

        logger.debug(f"Saving results to folder for timestamp '{timestamp}' to folder '{self.output_folder}'")

        if OutputFormat.IMAGE_ORIGINAL in self.output_formats:
            self._write_image_to_file(original_image, image_orig_file)
        if OutputFormat.IMAGE_WITH_PREDICTIONS in self.output_formats:
            self._write_image_to_file(image_with_visualization, image_viz_file)
        if OutputFormat.PREDICTIONS in self.output_formats:
            annotations = ToAnnotation.to_annotations(
                predictions,
                Roi(x=0, y=0, width=original_image.shape[0], height=original_image.shape[1]),
            )

            print(len(annotations), str(predictions))
            # TODO: add annotations here
            self._write_predictions_to_file(str(predictions), pred_txt_file)
            self._write_predictions_to_file(
                json.dumps({"annotations": [serialize_annotation(annotation) for annotation in annotations]}),
                pred_json_file,
            )
