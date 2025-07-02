import numpy as np
from model_api.models.result import DetectionResult
from model_api.visualizer.layout import Flatten
from model_api.visualizer.primitive import BoundingBox, Label
from model_api.visualizer.scene import DetectionScene
from PIL import Image


class DetectionVisualizer:
    @staticmethod
    def overlay_predictions(original_image: np.ndarray, predictions: DetectionResult) -> np.ndarray:
        image_pil = Image.fromarray(original_image)
        detection_scene = DetectionScene(image=image_pil, result=predictions, layout=Flatten(BoundingBox, Label))
        rendered_detections_pil = detection_scene.render()
        return np.array(rendered_detections_pil)


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
