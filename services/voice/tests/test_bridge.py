from voomate_voice.bridge import latest_user_text, voice_turn_payload


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
