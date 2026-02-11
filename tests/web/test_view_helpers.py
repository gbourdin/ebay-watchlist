from ebay_watchlist.web.view_helpers import (
    build_filter_pairs,
    build_home_url,
    build_page_sequence,
    get_main_category_name_by_id,
    normalize_multi,
    resolve_category_input_to_id,
)


def test_normalize_multi_strips_and_deduplicates_preserving_order():
    values = ["  alice  ", "", "bob", "alice", "  ", "charlie", "bob"]

    result = normalize_multi(values)

    assert result == ["alice", "bob", "charlie"]


def test_get_main_category_name_by_id_merges_defaults_and_suggestions():
    quick_filters = [(619, "Musical Instruments"), (58058, "Computers")]
    scraped_suggestions = [
        (619, "Should Not Override"),
        (1249, "Videogames"),
        (9999, ""),
    ]

    result = get_main_category_name_by_id(
        quick_category_filters=quick_filters,
        scraped_category_suggestions=scraped_suggestions,
    )

    assert result == {
        619: "Musical Instruments",
        58058: "Computers",
        1249: "Videogames",
    }


def test_build_filter_pairs_includes_multiselects_and_query():
    result = build_filter_pairs(
        selected_sellers=["alice"],
        selected_categories=["Electric Guitars", "Synthesizers"],
        selected_main_categories=["Musical Instruments"],
        search_query="Yamaha",
    )

    assert result == [
        ("seller", "alice"),
        ("category", "Electric Guitars"),
        ("category", "Synthesizers"),
        ("main_category", "Musical Instruments"),
        ("q", "Yamaha"),
    ]


def test_build_home_url_omits_page_on_first_page():
    result = build_home_url(
        filter_pairs=[("seller", "alice"), ("q", "synth")],
        sort="newest",
        view_mode="table",
        base_url="/",
        page=1,
    )

    assert result == "/?seller=alice&q=synth&sort=newest&view=table"


def test_build_home_url_includes_page_when_not_first_page():
    result = build_home_url(
        filter_pairs=[],
        sort="ending_soon",
        view_mode="cards",
        base_url="/",
        page=3,
    )

    assert result == "/?sort=ending_soon&view=cards&page=3"


def test_build_page_sequence_adds_ellipsis_for_gaps():
    result = build_page_sequence(page=6, total_pages=12, radius=2)

    assert result == [1, None, 4, 5, 6, 7, 8, None, 12]


def test_build_page_sequence_returns_single_page_for_empty_results():
    result = build_page_sequence(page=1, total_pages=1)

    assert result == [1]


def test_resolve_category_input_to_id_supports_exact_name_case_insensitive():
    name_by_id = {619: "Musical Instruments", 58058: "Computers"}

    result = resolve_category_input_to_id("musical instruments", name_by_id)

    assert result == 619


def test_resolve_category_input_to_id_supports_numeric_ids():
    name_by_id = {619: "Musical Instruments"}

    result = resolve_category_input_to_id("58058", name_by_id)

    assert result == 58058


def test_resolve_category_input_to_id_returns_none_for_unknown_values():
    name_by_id = {619: "Musical Instruments"}

    result = resolve_category_input_to_id("unknown", name_by_id)

    assert result is None
