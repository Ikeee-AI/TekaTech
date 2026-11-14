"""The OpenAI and Supabase service keys are SecretStr: never in reprs or logs, unwrapped only
where a client is built."""
from pydantic import SecretStr

from config import Settings, settings


def test_service_keys_are_secret_strings():
    assert isinstance(settings.openai_api_key, SecretStr)
    assert isinstance(settings.supabase_key, SecretStr)


def test_keys_do_not_appear_in_the_settings_repr():
    s = Settings(
        openai_api_key="openai-value-repr-check",
        supabase_url="https://example.supabase.co",
        supabase_key="service-role-value-repr-check",
        _env_file=None,
    )
    text = repr(s) + str(s) + str(s.model_dump())
    assert "openai-value-repr-check" not in text
    assert "service-role-value-repr-check" not in text
    assert s.openai_api_key.get_secret_value() == "openai-value-repr-check"


def test_clients_receive_the_plain_key():
    import embeddings
    from routers import query

    expected = settings.openai_api_key.get_secret_value()
    assert embeddings.client.api_key == expected
    assert query.client.api_key == expected
