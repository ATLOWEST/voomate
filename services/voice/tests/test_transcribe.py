from urllib.parse import parse_qs, urlparse

from pipecat.services.aws.utils import get_presigned_url

from voomate_voice.transcribe import VocabularyTranscribeSTTService


def test_aws_stream_url_carries_custom_vocabulary():
    url = get_presigned_url(
        region="us-east-1",
        credentials={"access_key": "test-access", "secret_key": "test-secret"},
        language_code="en-US",
        vocabulary_name="voomate-web-agent-en-us",
    )

    assert parse_qs(urlparse(url).query)["vocabulary-name"] == ["voomate-web-agent-en-us"]


def test_vocabulary_state_is_explicit():
    with_vocabulary = object.__new__(VocabularyTranscribeSTTService)
    with_vocabulary._vocabulary_name = "voomate-web-agent-en-us"
    without_vocabulary = object.__new__(VocabularyTranscribeSTTService)
    without_vocabulary._vocabulary_name = None
    assert with_vocabulary.vocabulary_enabled is True
    assert without_vocabulary.vocabulary_enabled is False
