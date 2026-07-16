import os
import json
import time
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

class SpeciesClassifier:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model_name = "gemini-3.5-flash"

    def clean_base64_image(self, base64_str: str) -> tuple[str, str]:
        """
        Strips metadata headers from a base64 image string if present.
        Returns (raw_base64_data, mime_type).
        """
        if "," in base64_str:
            header, base64_data = base64_str.split(",", 1)
            mime_type = header.split(";")[0].split(":")[1]
            return base64_data, mime_type
        return base64_str, "image/jpeg"

    def classify(
        self,
        leaf_image_base64: str,
        whole_plant_image_base64: Optional[str] = None,
        leaf_back_image_base64: Optional[str] = None,
        flower_fruit_image_base64: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Classifies the plant species using Gemini 2.5 Flash.
        Accepts 1 required image (leaf close-up) plus up to 3 optional
        images (whole plant, leaf back, flower/fruit) for better accuracy —
        mirrors the multi-organ approach used by PlantNet. All images are
        sent in a single request, not one call per image.
        Implements top-2 confidence-gap calibration.
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set in the environment variables.")

        # Build the list of image parts, tagging each so Gemini knows what
        # it's looking at rather than guessing from context.
        image_inputs = [("leaf close-up (required, primary evidence)", leaf_image_base64)]
        if whole_plant_image_base64:
            image_inputs.append(("whole plant / growth habit", whole_plant_image_base64))
        if leaf_back_image_base64:
            image_inputs.append(("leaf underside", leaf_back_image_base64))
        if flower_fruit_image_base64:
            image_inputs.append(("flower or fruit", flower_fruit_image_base64))

        image_parts = []
        image_labels_text = []
        for i, (label, b64) in enumerate(image_inputs, start=1):
            raw_base64, mime_type = self.clean_base64_image(b64)
            image_parts.append({"inlineData": {"mimeType": mime_type, "data": raw_base64}})
            image_labels_text.append(f"Image {i}: {label}")

        prompt = (
            "You are identifying a plant species from the following image(s):\n"
            + "\n".join(image_labels_text) + "\n\n"
            "Only the leaf close-up (Image 1) is guaranteed to be present. Use "
            "any additional images as supporting evidence, but do not penalize "
            "the identification if only the leaf image is available — rely on "
            "leaf shape, margin, venation, and texture in that case.\n\n"
            "Return a JSON object with this exact structure:\n"
            "{\n"
            "  \"guesses\": [\n"
            "    {\"species\": \"Botanical Name (Common Name)\", \"confidence_score\": 0.85},\n"
            "    {\"species\": \"Botanical Name (Common Name)\", \"confidence_score\": 0.15}\n"
            "  ],\n"
            "  \"reasoning\": \"Brief explanation of which images and features supported this identification.\"\n"
            "}\n"
            "Provide exactly 2 guesses. Confidence scores are relative numbers "
            "between 0.0 and 1.0 and should sum to 1.0."
        )

        payload = {
            "contents": [
                {"parts": [{"text": prompt}] + image_parts}
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "maxOutputTokens": 2048,
                "temperature": 0.2
            },
        }

        models_to_try = [
            "gemini-3.1-flash-lite",
            "gemini-2.5-flash-lite",
            "gemini-3.5-flash"
        ]
        last_exception = None

        for idx, model in enumerate(models_to_try):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": self.api_key,
                },
            )

            max_retries_for_model = 2
            for attempt in range(max_retries_for_model):
                try:
                    # Use a moderate timeout
                    timeout_val = 30
                    res = urllib.request.urlopen(req, timeout=timeout_val)
                    response_json = json.loads(res.read().decode("utf-8"))

                    candidates = response_json.get("candidates", [])
                    if not candidates:
                        raise ValueError("No response candidates returned by Gemini.")

                    text_content = candidates[0]["content"]["parts"][0]["text"]
                    
                    # Robust JSON cleaning and parsing
                    result_data = None
                    try:
                        cleaned_text = text_content.strip()
                        if cleaned_text.startswith("```"):
                            lines = cleaned_text.split("\n")
                            if lines[0].startswith("```"):
                                lines = lines[1:]
                            if lines and lines[-1].strip() == "```":
                                lines = lines[:-1]
                            cleaned_text = "\n".join(lines).strip()
                        
                        result_data = json.loads(cleaned_text)
                    except json.JSONDecodeError as jde:
                        import re
                        try:
                            cleaned_text = re.sub(r',\s*([\]}])', r'\1', cleaned_text)
                            result_data = json.loads(cleaned_text)
                        except Exception:
                            raise ValueError(f"JSON parsing failed: {str(jde)}. Raw text: {text_content[:600]}")

                    guesses = result_data.get("guesses", [])
                    reasoning = result_data.get("reasoning", "No reasoning provided.")

                    if len(guesses) < 2:
                        if len(guesses) == 1:
                            guesses.append({"species": "Unknown", "confidence_score": 0.0})
                        else:
                            guesses = [
                                {"species": "Unknown Plant", "confidence_score": 0.5},
                                {"species": "Alternative Unknown", "confidence_score": 0.5},
                            ]

                    guess_1 = guesses[0]
                    guess_2 = guesses[1]

                    g1_conf = float(guess_1.get("confidence_score", 0.5))
                    g2_conf = float(guess_2.get("confidence_score", 0.0))

                    gap = g1_conf - g2_conf

                    if gap < 0.20:
                        safe_gap = max(0.0, gap)
                        penalty_factor = safe_gap / 0.20
                        calibrated_confidence = g1_conf * penalty_factor
                        calibrated_confidence = max(0.10, calibrated_confidence)
                        was_calibrated = True
                    else:
                        calibrated_confidence = g1_conf
                        was_calibrated = False

                    return {
                        "species": guess_1["species"],
                        "raw_confidence": g1_conf,
                        "calibrated_confidence": calibrated_confidence,
                        "confidence_gap": gap,
                        "was_calibrated": was_calibrated,
                        "alternative_guess": guess_2["species"],
                        "alternative_raw_confidence": g2_conf,
                        "reasoning": reasoning,
                        "images_used": len(image_inputs),
                        "model_used": model,
                    }

                except urllib.error.HTTPError as e:
                    error_msg = e.read().decode('utf-8', errors='ignore')
                    last_exception = RuntimeError(f"Gemini API error ({model}) HTTP {e.code}: {error_msg}")
                    # If 429 or 503, maybe wait and try same model again
                    if e.code in [429, 503] and attempt < max_retries_for_model - 1:
                        print(f"Model {model} hit {e.code}. Waiting 5 seconds before retry...")
                        time.sleep(5)
                        continue
                    
                    if idx < len(models_to_try) - 1:
                        print(f"Model {model} failed with HTTP {e.code}. Falling back to next model...")
                        break # Break inner loop, go to next model
                    
                except Exception as e:
                    last_exception = RuntimeError(f"Model {model} failed: {str(e)}")
                    if attempt < max_retries_for_model - 1:
                        time.sleep(2)
                        continue
                    if idx < len(models_to_try) - 1:
                        print(f"Model {model} failed: {str(e)}. Falling back to next model...")
                        break
        
        # If we got here, all models failed
        raise last_exception
