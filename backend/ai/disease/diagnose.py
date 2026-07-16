import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any

from ai.disease.disease_mapping import get_disease_details

class DiseaseScanner:
    def __init__(self):
        # Read the Hugging Face token from environment variables
        self.api_token = os.environ.get("HF_API_TOKEN")
        self.model_id = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
        self.url = f"https://router.huggingface.co/hf-inference/models/{self.model_id}"

    def clean_base64_image(self, base64_str: str) -> bytes:
        """
        Converts base64 image string (with or without headers) to raw binary bytes.
        """
        if "," in base64_str:
            _, base64_data = base64_str.split(",", 1)
        else:
            base64_data = base64_str
        
        import base64
        return base64.b64decode(base64_data)

    def scan(self, image_base64: str) -> Dict[str, Any]:
        """
        Queries the Hugging Face Inference API for leaf disease classification.
        Matches result with static botanical treatments.
        """
        if not self.api_token:
            raise ValueError("HF_API_TOKEN is not configured in the environment variables.")
        
        # 1. Prepare raw image bytes
        image_bytes = self.clean_base64_image(image_base64)
        
        # 2. Build HTTP request
        req = urllib.request.Request(
            self.url,
            data=image_bytes,
            headers={
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/octet-stream"
            }
        )
        
        # 3. Call Hugging Face API
        try:
            res = urllib.request.urlopen(req, timeout=20)
            response_data = json.loads(res.read().decode("utf-8"))
            
            if not isinstance(response_data, list) or len(response_data) == 0:
                raise ValueError("Unexpected API response format from Hugging Face model.")
            
            # Extract top predicted candidate
            top_prediction = response_data[0]
            raw_label = top_prediction.get("label", "Healthy")
            confidence = float(top_prediction.get("score", 1.0))
            
            # 4. Map raw label to clean name and treatments
            disease_info = get_disease_details(raw_label)
            
            # Rules.md constraint: confidence < 70% triggers the expert-escalation flag
            needs_expert = confidence < 0.70
            
            return {
                "raw_label": raw_label,
                "clean_name": disease_info["clean_name"],
                "description": disease_info["description"],
                "is_healthy": disease_info["is_healthy"],
                "confidence": confidence,
                "needs_expert": needs_expert,
                "treatments": disease_info["treatments"]
            }
            
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="ignore")
            # If model is loading, it may return a 503 error
            if e.code == 503:
                raise RuntimeError("Hugging Face model is currently loading on their servers. Please try again in 1 minute.")
            raise RuntimeError(f"Hugging Face API returned HTTP {e.code}: {err_msg}")
        except Exception as e:
            raise RuntimeError(f"Leaf disease diagnosis scan failed: {str(e)}")
