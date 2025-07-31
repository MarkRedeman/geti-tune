from dataclasses import asdict, is_dataclass
import logging
import uuid
import cv2
from abc import ABC, abstractmethod
import numpy as np
from enum import Enum
from typing import Annotated, Literal

from model_api.models import (
    AnomalyResult,
    ClassificationResult,
    DetectedKeypoints,
    ImageResultWithSoftPrediction,
    RotatedSegmentationResult,
)
from model_api.models.result import DetectionResult, InstanceSegmentationResult, Result
from pydantic import BaseModel, Field
from pydantic.dataclasses import dataclass

from app.utils.singleton import Singleton

logger = logging.getLogger(__name__)


class LABEL_BEHAVIOUR(int, Enum):
    LOCAL = 1 << 1
    GLOBAL = 1 << 2
    EXCLUSIVE = 1 << 3
    ANOMALOUS = 1 << 4
    BACKGROUND = 1 << 5


class ShapeType(str, Enum):
    RECT = "bounding-box"
    ROTATED_RECT = "oriented-bounding-box"
    CIRCLE = "circle"
    POLYGON = "polygon"
    POSE = "pose"


@dataclass(frozen=True)
class Label:
    id: str
    # Behaviour
    # group: str
    # parent_label_id: str | None
    # behaviour: LABEL_BEHAVIOUR

    # Visualziatoin
    name: str
    # color: str
    # is_empty: bool

    # Source
    # source: dict
    score: float | None = None


@dataclass(frozen=True)
class Point:
    x: float
    y: float


class Rect(BaseModel):
    type: Literal[ShapeType.RECT]
    x: float
    y: float
    width: float
    height: float


class RotatedRect(BaseModel):
    type: Literal[ShapeType.ROTATED_RECT]
    cx: float
    cy: float
    width: float
    height: float
    angle: float


class Circle(BaseModel):
    type: Literal[ShapeType.CIRCLE]
    cx: float
    cy: float
    r: float


class Polygon(BaseModel):
    type: Literal[ShapeType.POLYGON]
    points: list[Point]


class KeypointNode(Point):
    label: Label
    is_visible: bool


class Pose(BaseModel):
    type: Literal[ShapeType.POSE]
    points: list[KeypointNode]


Shape = Annotated[
    Rect | RotatedRect | Circle | Polygon | Pose,
    Field(discriminator="type"),
]


@dataclass(frozen=True)
class Annotation:
    id: str
    labels: list[Label]
    shape: Shape
    z_index: int


@dataclass(frozen=True)
class Roi:
    x: int
    y: int
    width: int
    height: int


class AnnotationCreator(ABC):
    """Abstract base class for annotation creators."""

    @abstractmethod
    def to_annotations(self, result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""


class DetectionAnnotationCreator(AnnotationCreator):
    """Creator for detection visualizations."""

    def to_annotations(self, result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, DetectionResult):
            raise ValueError("Incorrect result")

        annotations = []

        for index, (bbox, label, score, name) in enumerate(
            zip(result.bboxes, result.labels, result.scores, result.label_names)
        ):
            x1, y1, x2, y2 = map(int, bbox)
            shape = Rect(type=ShapeType.RECT, x=x1, y=y1, width=x2 - x1, height=y2 - y1)
            labels = [Label(id=str(label), name=name, score=float(score))]

            annotation = Annotation(
                id=str(uuid.uuid4()),
                labels=labels,
                shape=shape,
                z_index=index,
            )

            annotations.append(annotation)

        return annotations


class InstanceSegmentationAnnotationCreator(AnnotationCreator):
    """Creator for instance segmentation visualizations."""

    def to_annotations(self, result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, InstanceSegmentationResult):
            raise ValueError("Incorrect result")

        height = roi.height
        width = roi.width
        annotations = []

        for index, (label, score, name, mask) in enumerate(
            zip(result.labels, result.scores, result.label_names, result.masks)
        ):
            contours, hierarchies = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

            labels = [Label(id=str(label), name=name, score=float(score))]

            if hierarchies is None:
                continue
            for contour, hierarchy in zip(contours, hierarchies[0]):
                if hierarchy[3] != -1:
                    continue
                if len(contour) <= 2 or cv2.contourArea(contour) < 1.0:
                    continue

                points = [
                    Point(
                        x=point[0][0],
                        y=point[0][1],
                    )
                    for point in list(contour)
                ]

                shape = Polygon(
                    type=ShapeType.POLYGON,
                    points=points,
                )
                annotations.append(
                    Annotation(
                        id=str(uuid.uuid4()),
                        labels=labels,
                        shape=shape,
                        z_index=index,
                    )
                )

        return annotations


class AnomalyDetectionAnnotationCreator(AnnotationCreator):
    """Creator for anomaly detection visualizations."""

    def to_annotations(self, result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, AnomalyResult):
            raise ValueError("Incorrect result")

        pred_label = result.pred_label if result.pred_label else "anomalous"
        score = result.pred_score if result.pred_score else 0
        labels = [Label(id=pred_label, name=pred_label, score=float(score))]

        shape = Rect(type=ShapeType.RECT, x=roi.x, y=roi.y, width=roi.width, height=roi.height)
        annotation = Annotation(
            id=str(uuid.uuid4()),
            labels=labels,
            shape=shape,
            z_index=0,
        )

        return [annotation]


class ClassificationAnnotationCreator(AnnotationCreator):
    """Creator for classification visualizations."""

    def to_annotations(self, result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, ClassificationResult):
            raise ValueError("Incorrect result")

        labels = []
        if result.top_labels:
            for _label_idx, label_name, prob in result.top_labels:
                labels.append(Label(id=str(label_name), name=label_name, score=float(prob)))

        shape = Rect(type=ShapeType.RECT, x=roi.x, y=roi.y, width=roi.width, height=roi.height)
        annotation = Annotation(
            id=str(uuid.uuid4()),
            labels=labels,
            shape=shape,
            z_index=0,
        )

        return [annotation]


class SegmentationAnnotationCreator(AnnotationCreator):
    """Creator for segmentation visualizations."""

    def get_contours(self, prediction: ImageResultWithSoftPrediction) -> list[(int)]:
        n_layers = prediction.soft_prediction.shape[2]

        if n_layers == 1:
            msg = "Cannot get contours from soft prediction with 1 layer"
            raise RuntimeError(msg)
        combined_contours = []
        for layer_index in range(1, n_layers):  # ignoring background
            if len(prediction.soft_prediction.shape) == 3:
                current_label_soft_prediction = prediction.soft_prediction[
                    :,
                    :,
                    layer_index,
                ]
            else:
                current_label_soft_prediction = prediction.soft_prediction

            obj_group = prediction.resultImage == layer_index
            label_index_map = obj_group.astype(np.uint8) * 255

            contours, _hierarchy = cv2.findContours(
                label_index_map,
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_NONE,
            )

            for contour in contours:
                mask = np.zeros(prediction.resultImage.shape, dtype=np.uint8)
                cv2.drawContours(
                    mask,
                    np.asarray([contour]),
                    contourIdx=-1,
                    color=1,
                    thickness=-1,
                )
                probability = cv2.mean(current_label_soft_prediction, mask)[0]
                combined_contours.append((layer_index, probability, contour))

        return combined_contours

    def to_annotations(self, result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, ImageResultWithSoftPrediction):
            raise ValueError("Incorrect result")

        # raise NotImplementedError
        predictions = result
        height = roi.height
        width = roi.width
        annotations = []

        # index=0 is reserved for the background label
        label_map = {label.name: label for label in self.labels}
        contours = self.get_contours(predictions)

        annotations: list[Annotation] = []
        height, width = predictions.resultImage.shape[:2]
        for index, contour in enumerate(contours):
            if len(contour.shape) == 0:
                continue

            approx_curve = cv2.approxPolyDP(contour.shape, 1.0, True)
            if len(approx_curve) <= 2:
                continue

            points = [Point(x=width * p[0][0] / (width - 1), y=height * p[0][1] / (height - 1)) for p in contour.shape]
            label = label_map[contour.label]

            shape = Polygon(
                type=ShapeType.POLYGON,
                points=points,
            )

            labels = [Label(id=str(label.id_), name=label.id_, score=float(contour.probability))]

            annotation = Annotation(
                id=str(uuid.uuid4()),
                shape=shape,
                labels=labels,
                z_index=index,
            )

            annotations.append(annotation)
        return annotations


class KeypointAnnotationCreator(AnnotationCreator):
    """Creator for keypoint visualizations."""

    def to_annotations(self, result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, DetectedKeypoints):
            raise ValueError("Incorrect result")

        return []


class RotatedRectAnnotationCreator(AnnotationCreator):
    """Creator for keypoint visualizations."""

    def to_annotations(self, result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, RotatedSegmentationResult):
            raise ValueError("Incorrect result")

        # result.rotated_rects

        return []


class AnnotationDispatcher(metaclass=Singleton):
    """Dispatcher for creating visualizations."""

    def __init__(self):
        self._creator_map = {
            DetectionResult: DetectionAnnotationCreator(),
            ClassificationResult: ClassificationAnnotationCreator(),
            InstanceSegmentationResult: InstanceSegmentationAnnotationCreator(),
            AnomalyResult: AnomalyDetectionAnnotationCreator(),
            ImageResultWithSoftPrediction: SegmentationAnnotationCreator(),
            DetectedKeypoints: KeypointAnnotationCreator(),
            RotatedSegmentationResult: RotatedRectAnnotationCreator(),
        }

    def to_annotations(self, result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""

        creator = self._creator_map.get(type(result))

        if creator is not None:
            return creator.to_annotations(result, roi)

        logger.error(f"Visualization for {type(result)} is not suppported.")
        return []


class ToAnnotation:
    @staticmethod
    def to_annotations(result: Result, roi: Roi) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        return AnnotationDispatcher().to_annotations(result, roi)


class DetectionResultToJson:
    @staticmethod
    def to_json_structure(result: DetectionResult):  # noqa: ANN205
        annotations = []
        for bbox, label, score, name in zip(result.bboxes, result.labels, result.scores, result.label_names):
            x1, y1, x2, y2 = map(int, bbox)
            annotation = {
                "labels": {"id": str(label), "name": name, "score": float(score)},
                "shape": {"type": "bounding-box", "x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
            }
            annotations.append(annotation)

        return annotations


def serialize_annotation(obj):  # noqa: ANN201
    """
    Recursively convert dataclasses, pydantic models, and lists/dicts
    to something that can be passed to json.dumps.
    """
    if isinstance(obj, BaseModel):
        # For Pydantic models
        return obj.model_dump()
    elif is_dataclass(obj):
        # For std and pydantic dataclasses
        d = asdict(obj)
        return {k: serialize_annotation(v) for k, v in d.items()}
    elif isinstance(obj, (list, tuple)):
        return [serialize_annotation(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: serialize_annotation(v) for k, v in obj.items()}
    else:
        return obj
