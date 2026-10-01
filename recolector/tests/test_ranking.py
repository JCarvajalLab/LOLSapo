from lolsapo.ranking import calcular_ranking, valor_rango


def amigo(riot_id, solo=None, winrate=None, partidas=0):
    return {
        "riot_id": riot_id,
        "slug": riot_id.lower().replace("#", "-"),
        "rangos": {"solo": solo, "flex": None},
        "estadisticas": {"total": {"winrate": winrate, "partidas": partidas}},
    }


def rango(tier, division, lp):
    return {"tier": tier, "division": division, "lp": lp}


def test_valor_rango_ordena_tier_division_y_lp():
    assert valor_rango(rango("GOLD", "I", 0)) > valor_rango(rango("GOLD", "II", 99))
    assert valor_rango(rango("PLATINUM", "IV", 0)) > valor_rango(rango("GOLD", "I", 99))
    assert valor_rango(rango("GOLD", "II", 50)) > valor_rango(rango("GOLD", "II", 49))
    assert valor_rango(rango("MASTER", None, 0)) > valor_rango(rango("DIAMOND", "I", 99))
    assert valor_rango(None) is None


def test_ranking_rankeados_primero_luego_por_winrate():
    ranking = calcular_ranking(
        [
            amigo("SinRango#LAS", winrate=80.0, partidas=10),
            amigo("Oro#LAS", solo=rango("GOLD", "II", 10)),
            amigo("Plata#LAS", solo=rango("SILVER", "I", 90)),
            amigo("SinNada#LAS"),
            amigo("Malo#LAS", winrate=20.0, partidas=30),
        ]
    )
    assert [r["riot_id"] for r in ranking] == [
        "Oro#LAS",
        "Plata#LAS",
        "SinRango#LAS",
        "Malo#LAS",
        "SinNada#LAS",
    ]
    assert [r["posicion"] for r in ranking] == [1, 2, 3, 4, 5]
    assert ranking[0]["criterio"] == "rango"
    assert ranking[2]["criterio"] == "winrate"


def test_ranking_tolera_amigos_sin_datos():
    sin_datos = {"riot_id": "X#LAS", "slug": "x-las", "rangos": None, "estadisticas": None}
    assert calcular_ranking([sin_datos])[0]["posicion"] == 1
