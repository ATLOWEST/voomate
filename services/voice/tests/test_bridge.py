from voomate_voice.bridge import VoomateAgentBridge, latest_user_text, voice_turn_payload


class Context:
    def get_messages(self):
        return [
            {"role": "assistant", "content": "Earlier"},
            {"role": "user", "content": [{"text": "Follow-up question"}]},
        ]


def test_extracts_only_latest_user_text():
    assert latest_user_text(Context()) == "Follow-up question"


def test_new_voice_turn_omits_optional_conversation_id():
    assert voice_turn_payload("Hello", None, "http://localhost:3000/") == {
        "message": "Hello",
        "imageIds": [],
        "pageUrl": "http://localhost:3000/",
    }


def test_voice_turn_forwards_passive_page_context():
    page_context = {
        "url": "https://app.example/agents",
        "title": "Agents",
        "description": "Choose, connect, and operate the agents this workspace needs.",
        "headings": ["Agents"],
        "navigation": [],
    }
    assert voice_turn_payload("Explain this page", None, page_context["url"], page_context) == {
        "message": "Explain this page",
        "imageIds": [],
        "pageUrl": "https://app.example/agents",
        "pageContext": page_context,
    }


def test_live_voice_context_update_is_origin_bound():
    bridge = VoomateAgentBridge(
        backend_origin="https://backend.example",
        token="secret",
        widget_origin="https://app.example",
        conversation_id=None,
        page_url="https://app.example/",
    )
    pricing = {"url": "https://app.example/pricing", "title": "Pricing"}
    assert bridge.update_page_context(pricing["url"], pricing) is True
    assert bridge.update_page_context("https://evil.example/pricing", pricing) is False
