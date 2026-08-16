import pytest
from pipecat.frames.frames import TranscriptionFrame

from bot import (
    generative_polly_settings,
    production_vad_params,
    required_transcribe_vocabulary_name,
)
from voomate_voice.telemetry import should_accept_transcript, transcript_confidence


def result(*confidences: float):
    return {
        "Alternatives": [
            {
                "Items": [
                    {"Type": "pronunciation", "Confidence": str(value)} for value in confidences
                ]
            }
        ]
    }


def frame(text: str, *confidences: float):
    return TranscriptionFrame(text, "visitor", "2026-08-13T10:00:00Z", result=result(*confidences))


def test_production_vad_is_conservative():
    params = production_vad_params()
    assert params.confidence >= 0.8
    assert params.min_volume >= 0.7
    assert params.stop_secs >= 0.6


def test_voice_requires_generative_polly_and_a_custom_vocabulary(monkeypatch):
    monkeypatch.setenv("POLLY_ENGINE", "generative")
    monkeypatch.setenv("TRANSCRIBE_VOCABULARY_NAME", "voomate-web-agent-en-us")
    assert generative_polly_settings().engine == "generative"
    assert required_transcribe_vocabulary_name() == "voomate-web-agent-en-us"

    monkeypatch.delenv("TRANSCRIBE_VOCABULARY_NAME")
    with pytest.raises(RuntimeError, match="TRANSCRIBE_VOCABULARY_NAME"):
        required_transcribe_vocabulary_name()

    monkeypatch.setenv("POLLY_ENGINE", "neural")
    with pytest.raises(RuntimeError, match="POLLY_ENGINE=generative"):
        generative_polly_settings()


def test_transcript_confidence_averages_pronunciation_items():
    assert transcript_confidence(result(0.8, 0.9, 1.0)) == 0.9


def test_low_confidence_and_missing_confidence_are_rejected():
    assert should_accept_transcript(frame("background maybe", 0.31, 0.42), 0.78)[0] is False
    missing = TranscriptionFrame("garbled", "visitor", "2026-08-13T10:00:00Z", result={})
    assert should_accept_transcript(missing, 0.78) == (False, None)


def test_clear_short_and_long_phrases_are_accepted():
    phrases = [
        "pricing",
        "open pricing",
        "what does this page do",
        "show me the blue jacket",
        "is my order on the way",
        "book a consultation tomorrow",
        "compare the available plans",
        "tell me about your return policy",
        "go back to the dashboard",
        "I need help setting up my account",
        "which appointment slots are available",
        "can you explain this service",
    ]
    assert len(phrases) == 12
    assert all(should_accept_transcript(frame(phrase, 0.91, 0.88), 0.78)[0] for phrase in phrases)
