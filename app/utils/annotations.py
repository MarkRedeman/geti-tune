import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Annotated, Literal

from model_api.models import (
    AnomalyResult,
    ClassificationResult,
    DetectedKeypoints,
    ImageResultWithSoftPrediction,
    RotatedSegmentationResult,
    get_contours,
)
from model_api.models.result import DetectionResult, InstanceSegmentationResult, Result
from pydantic import BaseModel, Field

from app.utils.singleton import Singleton

logger = logging.getLogger(__name__)


class LABEL_BEHAVIOUR(int, Enum):
    LOCAL = 1 << 1
    GLOBAL = 1 << 2
    EXCLUSIVE = 1 << 3
    ANOMALOUS = 1 << 4
    BACKGROUND = 1 << 5


class ShapeType(str, Enum):
    RECT = "rect"
    ROTATED_RECT = "rotated-rect"
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


class Point:
    x: float
    y: float


class Rect(BaseModel):
    shape_type: Literal[ShapeType.RECT]
    x: float
    y: float
    width: float
    height: float


class RotatedRect(BaseModel):
    shape_type: Literal[ShapeType.ROTATED_RECT]
    x: float
    y: float
    width: float
    height: float
    angle: float


class Circle(BaseModel):
    shape_type: Literal[ShapeType.CIRCLE]
    x: float
    y: float
    r: float


class Polygon(BaseModel):
    shape_type: Literal[ShapeType.POLYGON]
    points: list[Point]


class KeypointNode(Point):
    label: Label
    is_visible: bool


class Pose(BaseModel):
    shape_type: Literal[ShapeType.POSE]
    points: list[KeypointNode]


Shape = Annotated[
    Rect | RotatedRect | Circle | Polygon | Pose,
    Field(discriminator="shape_type"),
]


@dataclass(frozen=True)
class Annotation:
    id: str
    labels: list[Label]
    shape: Shape
    z_index: int


class AnnotationCreator(ABC):
    """Abstract base class for annotation creators."""

    @abstractmethod
    def to_annotations(self, result: Result) -> list[Annotation]:
        """Create a annotations structure from model api result."""


class DetectionAnnotationCreator(AnnotationCreator):
    """Creator for detection visualizations."""

    def to_annotations(self, result: Result) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, DetectionResult):
            raise ValueError("Incorrect result")

        annotations = []
        for index, (bbox, label, score, name) in enumerate(
            zip(result.bboxes, result.labels, result.scores, result.label_names)
        ):
            x1, y1, x2, y2 = map(int, bbox)
            shape = Rect(shape_type=ShapeType.RECT, x=x1, y=y1, width=x2 - x1, height=y2 - y1)
            labels = [Label(id=str(label), name=name, score=float(score))]

            annotation = Annotation(
                id=str(uuid.uuid4()),
                labels=labels,
                shape=shape,
                z_index=index,
            )

            annotations.append(annotation)

        return []


class InstanceSegmentationAnnotationCreator(AnnotationCreator):
    """Creator for instance segmentation visualizations."""

    def to_annotations(self, result: Result) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, InstanceSegmentationResult):
            raise ValueError("Incorrect result")

        contours = get_contours(result)
        print(contours)
        # result.masks

        # TODO
        annotations = []
        for index, (bbox, label, score, name) in enumerate(
            zip(result.bboxes, result.labels, result.scores, result.label_names)
        ):
            x1, y1, x2, y2 = map(int, bbox)
            shape = Rect(shape_type=ShapeType.RECT, x=x1, y=y1, width=x2 - x1, height=y2 - y1)
            labels = [Label(id=str(label), name=name, score=float(score))]

            annotation = Annotation(
                id=str(uuid.uuid4()),
                labels=labels,
                shape=shape,
                z_index=index,
            )

            annotations.append(annotation)

        return []
        # image_pil = Image.fromarray(original_image)
        # segmentation_scene = InstanceSegmentationScene(
        #     image=image_pil,
        #     result=predictions,
        # )
        # rendered_segmentation_pil = segmentation_scene.render()
        # return np.array(rendered_segmentation_pil)


class AnomalyDetectionAnnotationCreator(AnnotationCreator):
    """Creator for anomaly detection visualizations."""

    def to_annotations(self, result: Result) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, AnomalyResult):
            raise ValueError("Incorrect result")

        return []
        # """Create a visualization of the anomaly detection predictions on the original image."""
        # image_pil = Image.fromarray(original_image)
        # anomaly_detection_scene = AnomalyScene(
        #     image=image_pil,
        #     result=predictions,
        # )
        # rendered_anomaly_detection_pil = anomaly_detection_scene.render()
        # return np.array(rendered_anomaly_detection_pil)


class ClassificationAnnotationCreator(AnnotationCreator):
    """Creator for classification visualizations."""

    def to_annotations(self, result: Result) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, ClassificationResult):
            raise ValueError("Incorrect result")

        # determine width height from result.saliency_map

        return []
        # """Create a visualization of the classification predictions on the original image."""
        # image_pil = Image.fromarray(original_image)
        # classification_scene = ClassificationScene(
        #     image=image_pil,
        #     result=predictions,
        # )
        # rendered_classification_pil = classification_scene.render()
        # return np.array(rendered_classification_pil)


class SegmentationAnnotationCreator(AnnotationCreator):
    """Creator for segmentation visualizations."""

    def to_annotations(self, result: Result) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, ImageResultWithSoftPrediction):
            raise ValueError("Incorrect result")

        contours = get_contours(result)
        print(contours)

        return []
        # """Create a visualization of the segmentation predictions on the original image."""
        # image_pil = Image.fromarray(original_image)
        # segmentation_scene = SegmentationScene(
        #     image=image_pil,
        #     result=predictions,
        # )
        # rendered_segmentation_pil = segmentation_scene.render()
        # return np.array(rendered_segmentation_pil)


class KeypointAnnotationCreator(AnnotationCreator):
    """Creator for keypoint visualizations."""

    def to_annotations(self, result: Result) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        if not isinstance(result, DetectedKeypoints):
            raise ValueError("Incorrect result")

        return []
        # """Create a visualization of the keypoint predictions on the original image."""
        # image_pil = Image.fromarray(original_image)
        # keypoint_scene = KeypointScene(
        #     image=image_pil,
        #     result=predictions,
        # )
        # rendered_keypoint_pil = keypoint_scene.render()
        # return np.array(rendered_keypoint_pil)


class RotatedRectAnnotationCreator(AnnotationCreator):
    """Creator for keypoint visualizations."""

    def to_annotations(self, result: Result) -> list[Annotation]:
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

    def to_annotations(self, result: Result) -> list[Annotation]:
        """Create a annotations structure from model api result."""

        creator = self._creator_map.get(type(result))
        if creator is not None:
            return creator.to_annotations(result)

        logger.error(f"Visualization for {type(result)} is not suppported.")
        return []


class ToAnnotation:
    @staticmethod
    def to_annotations(result: Result) -> list[Annotation]:
        """Create a annotations structure from model api result."""
        return AnnotationDispatcher().to_annotations(result)


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
