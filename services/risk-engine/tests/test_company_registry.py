import httpx

from app.company_registry import (
    BrasilApiCompanyRegistry,
    CompanyRegistryError,
    CompanyRegistryNotFound,
    normalize_cnpj,
)

FIXTURE = {
    "cnpj": "19131243000197",
    "razao_social": "EMPRESA DEMONSTRACAO LTDA",
    "nome_fantasia": "EMPRESA DEMO",
    "descricao_situacao_cadastral": "ATIVA",
    "cnae_fiscal": 6201501,
    "cnae_fiscal_descricao": "Desenvolvimento de programas de computador sob encomenda",
    "municipio": "SAO PAULO",
    "uf": "SP",
    "cep": "01001000",
    "data_inicio_atividade": "2020-01-02",
    "porte": "DEMAIS",
    "natureza_juridica": "206-2 - Sociedade Empresaria Limitada",
}


def test_normalize_cnpj_accepts_formatted_input():
    assert normalize_cnpj("19.131.243/0001-97") == "19131243000197"


def test_normalize_cnpj_rejects_bad_shape():
    try:
        normalize_cnpj("11111111111111")
    except ValueError:
        return
    raise AssertionError("Expected invalid CNPJ shape to raise ValueError")


def test_registry_maps_public_data_without_turning_it_into_risk_signal():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["user_agent"] = request.headers.get("user-agent")
        return httpx.Response(200, json=FIXTURE)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    registry = BrasilApiCompanyRegistry(client=client)

    profile = registry.fetch("19.131.243/0001-97")

    assert profile.cnpj == "19131243000197"
    assert profile.legal_name == "EMPRESA DEMONSTRACAO LTDA"
    assert profile.primary_cnae_code == 6201501
    assert profile.state == "SP"
    assert profile.source_name == "BrasilAPI / Minha Receita"
    assert profile.source_is_official is False
    assert profile.risk_signal is False
    assert "ATLAS-SAC-Portfolio" in captured["user_agent"]
    assert captured["url"].endswith("/19131243000197")


def test_registry_translates_not_found_without_retrying():
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(404, json={"message": "not found"})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    registry = BrasilApiCompanyRegistry(client=client, sleep=lambda _: None)

    try:
        registry.fetch("19131243000197")
    except CompanyRegistryNotFound:
        assert calls == 1
        return
    raise AssertionError("Expected missing CNPJ to raise CompanyRegistryNotFound")


def test_registry_retries_transient_status_then_recovers():
    calls = 0
    delays: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(503, json={"message": "temporary"})
        return httpx.Response(200, json=FIXTURE)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    registry = BrasilApiCompanyRegistry(
        client=client,
        sleep=delays.append,
        jitter=lambda _start, _end: 0.0,
    )

    profile = registry.fetch("19131243000197")

    assert profile.legal_name == "EMPRESA DEMONSTRACAO LTDA"
    assert calls == 2
    assert delays == [0.2]


def test_registry_stops_after_bounded_transient_failures():
    calls = 0
    delays: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(503, json={"message": "temporary"})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    registry = BrasilApiCompanyRegistry(
        client=client,
        max_attempts=3,
        sleep=delays.append,
        jitter=lambda _start, _end: 0.0,
    )

    try:
        registry.fetch("19131243000197")
    except CompanyRegistryError:
        assert calls == 3
        assert delays == [0.2, 0.4]
        return
    raise AssertionError("Expected repeated transient failures to raise CompanyRegistryError")


def test_registry_retries_request_error_then_recovers():
    calls = 0
    delays: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise httpx.ConnectError("temporary network failure", request=request)
        return httpx.Response(200, json=FIXTURE)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    registry = BrasilApiCompanyRegistry(
        client=client,
        sleep=delays.append,
        jitter=lambda _start, _end: 0.0,
    )

    profile = registry.fetch("19131243000197")

    assert profile.cnpj == "19131243000197"
    assert calls == 2
    assert delays == [0.2]
