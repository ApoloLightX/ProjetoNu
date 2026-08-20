import pytest
from pydantic import ValidationError

from app.schemas import EvidenceInput, MAX_EVIDENCE_PAYLOAD_BYTES


def test_evidence_payload_accepts_small_structured_data():
    evidence = EvidenceInput(
        evidence_type="registry_context",
        source_name="fixture",
        payload={"status": "ok", "score": 1},
    )

    assert evidence.payload["status"] == "ok"


def test_evidence_payload_rejects_oversized_data():
    oversized = "x" * (MAX_EVIDENCE_PAYLOAD_BYTES + 1)

    with pytest.raises(ValidationError, match="Evidence payload must be at most"):
        EvidenceInput(
            evidence_type="document_excerpt",
            source_name="fixture",
            payload={"text": oversized},
        )
