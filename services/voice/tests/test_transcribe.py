from urllib.parse import parse_qs, urlparse

from pipecat.services.aws.utils import get_presigned_url


def test_aws_stream_url_carries_custom_vocabulary():
    url = get_presigned_url(
        region="us-east-1",
        credentials={"access_key": "test-access", "secret_key": "test-secret"},
        language_code="en-US",
        vocabulary_name="voomate-web-agent-en-us",
    )

    assert parse_qs(urlparse(url).query)["vocabulary-name"] == ["voomate-web-agent-en-us"]
