from urllib.parse import urlencode


def normalize_multi(values: list[str]) -> list[str]:
    normalized: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned not in normalized:
            normalized.append(cleaned)
    return normalized


def get_main_category_name_by_id(
    quick_category_filters: list[tuple[int, str]],
    scraped_category_suggestions: list[tuple[int, str]],
) -> dict[int, str]:
    name_by_id = {category_id: name for category_id, name in quick_category_filters}
    for category_id, category_label in scraped_category_suggestions:
        if category_id not in name_by_id and category_label:
            name_by_id[category_id] = category_label
    return name_by_id


def resolve_category_input_to_id(
    category_input: str,
    category_name_by_id: dict[int, str],
) -> int | None:
    cleaned = category_input.strip()
    if not cleaned:
        return None

    if cleaned.isdigit():
        return int(cleaned)

    id_by_lower_name = {
        name.lower(): category_id for category_id, name in category_name_by_id.items()
    }
    return id_by_lower_name.get(cleaned.lower())


def build_filter_pairs(
    selected_sellers: list[str],
    selected_categories: list[str],
    selected_main_categories: list[str],
    search_query: str,
) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    pairs.extend(("seller", seller) for seller in selected_sellers)
    pairs.extend(("category", category_name) for category_name in selected_categories)
    pairs.extend(
        ("main_category", category_name) for category_name in selected_main_categories
    )
    if search_query:
        pairs.append(("q", search_query))
    return pairs


def build_home_url(
    filter_pairs: list[tuple[str, str]],
    sort: str,
    view_mode: str,
    base_url: str,
    page: int = 1,
) -> str:
    query_pairs = list(filter_pairs)
    query_pairs.append(("sort", sort))
    query_pairs.append(("view", view_mode))
    if page > 1:
        query_pairs.append(("page", str(page)))

    encoded = urlencode(query_pairs)
    if not encoded:
        return base_url
    return f"{base_url}?{encoded}"


def build_page_sequence(
    page: int,
    total_pages: int,
    radius: int = 2,
) -> list[int | None]:
    if total_pages <= 1:
        return [1]

    visible_pages = {1, total_pages}
    start_page = max(1, page - radius)
    end_page = min(total_pages, page + radius)
    visible_pages.update(range(start_page, end_page + 1))

    sequence: list[int | None] = []
    previous: int | None = None
    for page_number in sorted(visible_pages):
        if previous is not None and (page_number - previous) > 1:
            sequence.append(None)
        sequence.append(page_number)
        previous = page_number

    return sequence
