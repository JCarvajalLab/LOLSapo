import pytest
import requests
import responses
from conftest import KEY_FALSA, cuenta

from lolsapo.riot_api import (
    URL_PLATAFORMA,
    URL_REGION,
    ErrorAutenticacion,
    ErrorRiot,
    Limitador,
    NoEncontrado,
    PeticionInvalida,
)

URL_CUENTA = f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/Johnadis/LAS"
URL_ACTIVA = f"{URL_PLATAFORMA}/lol/spectator/v5/active-games/by-summoner/abc"


@responses.activate
def test_envia_la_key_solo_en_el_header(cliente):
    responses.get(URL_CUENTA, json=cuenta("Johnadis"))
    assert cliente.cuenta_por_riot_id("Johnadis", "LAS")["gameName"] == "Johnadis"
    llamada = responses.calls[0].request
    assert llamada.headers["X-Riot-Token"] == KEY_FALSA
    assert KEY_FALSA not in llamada.url


@responses.activate
def test_codifica_espacios_y_unicode_en_el_riot_id(cliente):
    responses.get(f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/Big%20Gato/LAS", json={})
    responses.get(f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/Nic%C3%B8/LAS", json={})
    cliente.cuenta_por_riot_id("Big Gato", "LAS")
    cliente.cuenta_por_riot_id("Nicø", "LAS")
    assert len(responses.calls) == 2


@responses.activate
def test_partida_activa_404_significa_no_esta_jugando(cliente):
    responses.get(URL_ACTIVA, status=404)
    assert cliente.partida_activa("abc") is None


@responses.activate
def test_404_en_cuenta_es_no_encontrado(cliente):
    responses.get(URL_CUENTA, status=404)
    with pytest.raises(NoEncontrado):
        cliente.cuenta_por_riot_id("Johnadis", "LAS")


@responses.activate
def test_429_espera_retry_after_y_reintenta(cliente, dormir):
    responses.get(URL_CUENTA, status=429, headers={"Retry-After": "7"})
    responses.get(URL_CUENTA, json=cuenta("Johnadis"))
    assert cliente.cuenta_por_riot_id("Johnadis", "LAS")["gameName"] == "Johnadis"
    assert dormir.esperas == [7.0]


@responses.activate
def test_429_sin_retry_after_espera_un_segundo(cliente, dormir):
    responses.get(URL_CUENTA, status=429)
    responses.get(URL_CUENTA, json=cuenta("Johnadis"))
    cliente.cuenta_por_riot_id("Johnadis", "LAS")
    assert dormir.esperas == [1.0]


@responses.activate
def test_5xx_reintenta_con_espera_creciente(cliente, dormir):
    responses.get(URL_CUENTA, status=503)
    responses.get(URL_CUENTA, status=500)
    responses.get(URL_CUENTA, json=cuenta("Johnadis"))
    cliente.cuenta_por_riot_id("Johnadis", "LAS")
    assert dormir.esperas == [1, 2]


@responses.activate
def test_5xx_persistente_termina_en_error(cliente):
    responses.get(URL_CUENTA, status=503)
    with pytest.raises(ErrorRiot) as error:
        cliente.cuenta_por_riot_id("Johnadis", "LAS")
    assert len(responses.calls) == 3  # 1 intento + 2 reintentos
    assert error.value.estado == 503


@responses.activate
def test_error_de_red_reintenta(cliente):
    responses.get(URL_CUENTA, body=requests.ConnectionError("sin red"))
    responses.get(URL_CUENTA, json=cuenta("Johnadis"))
    assert cliente.cuenta_por_riot_id("Johnadis", "LAS")["gameName"] == "Johnadis"


@pytest.mark.parametrize("estado", [401, 403])
@responses.activate
def test_key_rechazada_es_error_de_autenticacion(cliente, estado):
    responses.get(URL_CUENTA, status=estado)
    with pytest.raises(ErrorAutenticacion) as error:
        cliente.cuenta_por_riot_id("Johnadis", "LAS")
    assert KEY_FALSA not in str(error.value)
    assert len(responses.calls) == 1  # no se reintenta


@responses.activate
def test_400_es_peticion_invalida(cliente):
    responses.get(f"{URL_PLATAFORMA}/lol/summoner/v4/summoners/by-puuid/abc", status=400)
    with pytest.raises(PeticionInvalida):
        cliente.invocador("abc")


@responses.activate
def test_ids_partidas_pide_todos_los_modos(cliente):
    url = f"{URL_REGION}/lol/match/v5/matches/by-puuid/abc/ids"
    responses.get(url, json=["LA2_1", "LA2_2"])
    assert cliente.ids_partidas("abc", 20) == ["LA2_1", "LA2_2"]
    consulta = responses.calls[0].request.url
    assert "count=20" in consulta
    assert "type=" not in consulta and "queue=" not in consulta


@pytest.mark.parametrize("estado", [301, 302, 307])
@responses.activate
def test_no_sigue_redirecciones_para_no_filtrar_la_key(cliente, estado):
    responses.get(URL_CUENTA, status=estado, headers={"Location": "https://malicioso.example/x"})
    responses.get("https://malicioso.example/x", json={})
    with pytest.raises(ErrorRiot, match="redirección"):
        cliente.cuenta_por_riot_id("Johnadis", "LAS")
    assert [c.request.url for c in responses.calls] == [URL_CUENTA]


@responses.activate
def test_los_errores_no_muestran_puuid_ni_riot_id(cliente):
    puuid = "PUUIDSECRETO".ljust(78, "x")
    responses.get(f"{URL_PLATAFORMA}/lol/summoner/v4/summoners/by-puuid/{puuid}", status=418)
    responses.get(f"{URL_REGION}/lol/match/v5/matches/by-puuid/{puuid}/ids", status=503)
    responses.get(URL_CUENTA, status=404)
    errores = []
    for llamada in (
        lambda: cliente.invocador(puuid),
        lambda: cliente.ids_partidas(puuid, 5),
        lambda: cliente.cuenta_por_riot_id("Johnadis", "LAS"),
    ):
        with pytest.raises(ErrorRiot) as error:
            llamada()
        errores.append(str(error.value))
    assert "by-puuid/***" in errores[0]
    assert "by-puuid/***/ids" in errores[1]
    assert "by-riot-id/***" in errores[2]
    assert not any(puuid in e or "Johnadis" in e for e in errores)


def test_repr_no_muestra_la_key(cliente):
    assert KEY_FALSA not in repr(cliente)


class RelojFalso:
    def __init__(self):
        self.ahora = 0.0
        self.esperas = []

    def __call__(self):
        return self.ahora

    def dormir(self, segundos):
        self.esperas.append(segundos)
        self.ahora += segundos


def test_limitador_respeta_la_ventana_corta():
    reloj = RelojFalso()
    limitador = Limitador(ventanas=((3, 1.0),), reloj=reloj, dormir=reloj.dormir)
    for _ in range(3):
        limitador.esperar_turno()
    assert reloj.esperas == []
    limitador.esperar_turno()
    assert reloj.esperas == [1.0]


def test_limitador_respeta_la_ventana_larga():
    reloj = RelojFalso()
    limitador = Limitador(ventanas=((10, 1.0), (4, 60.0)), reloj=reloj, dormir=reloj.dormir)
    for _ in range(4):
        limitador.esperar_turno()
        reloj.ahora += 2
    limitador.esperar_turno()
    # La primera llamada fue en t=0; la quinta debe esperar hasta t=60.
    assert reloj.ahora == 60.0
