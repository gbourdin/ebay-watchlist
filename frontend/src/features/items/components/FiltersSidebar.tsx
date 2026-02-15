import { useEffect, useMemo, useState } from "react";

import {
  fetchCategorySuggestions,
  fetchSellerSuggestions,
  type Suggestion,
} from "../api";
import type { ItemsQueryState } from "../query-state";
import type { UseItemsQueryResult } from "../useItemsQuery";

const MAIN_CATEGORY_OPTIONS = ["Musical Instruments", "Computers", "Videogames"];

type MultiField = "seller" | "main_category" | "category";

interface FiltersSidebarProps {
  itemsQuery: UseItemsQueryResult;
}

function mergeUnique(values: string[], value: string): string[] {
  if (values.includes(value)) {
    return values;
  }
  return [...values, value];
}

function removeValue(values: string[], value: string): string[] {
  return values.filter((item) => item !== value);
}

function addQueryTag(
  prev: ItemsQueryState,
  field: MultiField,
  value: string
): Partial<ItemsQueryState> {
  if (!value) {
    return { page: 1 };
  }

  return {
    [field]: mergeUnique(prev[field], value),
    page: 1,
  } as Partial<ItemsQueryState>;
}

function removeQueryTag(
  prev: ItemsQueryState,
  field: MultiField,
  value: string
): Partial<ItemsQueryState> {
  return {
    [field]: removeValue(prev[field], value),
    page: 1,
  } as Partial<ItemsQueryState>;
}

function findMatchingOption(input: string, options: string[]): string | null {
  const cleaned = input.trim();
  if (!cleaned) {
    return null;
  }

  const normalized = cleaned.toLowerCase();
  for (const option of options) {
    if (option.toLowerCase() === normalized) {
      return option;
    }
  }
  return null;
}

function TagPills({
  values,
  onRemove,
}: {
  values: string[];
  onRemove: (value: string) => void;
}) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onRemove(value)}
          className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100"
        >
          {value} ×
        </button>
      ))}
    </div>
  );
}

function SuggestionsList({
  id,
  suggestions,
}: {
  id: string;
  suggestions: Suggestion[];
}) {
  return (
    <datalist id={id}>
      {suggestions.map((item) => (
        <option key={`${id}-${item.value}`} value={item.value} />
      ))}
    </datalist>
  );
}

export default function FiltersSidebar({ itemsQuery }: FiltersSidebarProps) {
  const { query, updateQuery } = itemsQuery;

  const [sellerInput, setSellerInput] = useState("");
  const [mainCategoryInput, setMainCategoryInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");

  const [sellerSuggestions, setSellerSuggestions] = useState<Suggestion[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<Suggestion[]>([]);

  const mainCategorySuggestions = useMemo(() => {
    if (!mainCategoryInput.trim()) {
      return MAIN_CATEGORY_OPTIONS;
    }

    const normalized = mainCategoryInput.toLowerCase();
    return MAIN_CATEGORY_OPTIONS.filter((option) =>
      option.toLowerCase().includes(normalized)
    );
  }, [mainCategoryInput]);

  useEffect(() => {
    let cancelled = false;

    if (sellerInput.trim().length < 2) {
      setSellerSuggestions([]);
      return;
    }

    void fetchSellerSuggestions(sellerInput).then((result) => {
      if (!cancelled) {
        setSellerSuggestions(result.items);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sellerInput]);

  useEffect(() => {
    let cancelled = false;

    if (categoryInput.trim().length < 2) {
      setCategorySuggestions([]);
      return;
    }

    void fetchCategorySuggestions(categoryInput, query.main_category).then((result) => {
      if (!cancelled) {
        setCategorySuggestions(result.items);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [categoryInput, query.main_category]);

  function addTag(field: MultiField, value: string) {
    const cleaned = value.trim();
    if (!cleaned) {
      return;
    }

    updateQuery((prev) => addQueryTag(prev, field, cleaned));
  }

  function removeTag(field: MultiField, value: string) {
    updateQuery((prev) => removeQueryTag(prev, field, value));
  }

  function tryAddIfMatches(field: MultiField, rawValue: string, options: string[]): boolean {
    const match = findMatchingOption(rawValue, options);
    if (!match) {
      return false;
    }
    addTag(field, match);
    return true;
  }

  return (
    <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      <section className="space-y-2">
        <label
          className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
          htmlFor="filter-sellers"
        >
          Sellers
        </label>
        <TagPills values={query.seller} onRemove={(value) => removeTag("seller", value)} />
        <input
          id="filter-sellers"
          list="seller-suggestions"
          value={sellerInput}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSellerInput(nextValue);
            const suggestionOptions = sellerSuggestions.map((item) => item.value);
            if (tryAddIfMatches("seller", nextValue, suggestionOptions)) {
              setSellerInput("");
            }
          }}
          onBlur={() => {
            const suggestionOptions = sellerSuggestions.map((item) => item.value);
            if (tryAddIfMatches("seller", sellerInput, suggestionOptions)) {
              setSellerInput("");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag("seller", sellerInput);
              setSellerInput("");
            }
          }}
          placeholder="Type seller and press Enter"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400"
        />
        <SuggestionsList id="seller-suggestions" suggestions={sellerSuggestions} />
      </section>

      <section className="space-y-2">
        <label
          className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
          htmlFor="filter-main-categories"
        >
          Main Categories
        </label>
        <TagPills
          values={query.main_category}
          onRemove={(value) => removeTag("main_category", value)}
        />
        <input
          id="filter-main-categories"
          list="main-category-suggestions"
          value={mainCategoryInput}
          onChange={(event) => {
            const nextValue = event.target.value;
            setMainCategoryInput(nextValue);
            if (tryAddIfMatches("main_category", nextValue, MAIN_CATEGORY_OPTIONS)) {
              setMainCategoryInput("");
            }
          }}
          onBlur={() => {
            if (tryAddIfMatches("main_category", mainCategoryInput, MAIN_CATEGORY_OPTIONS)) {
              setMainCategoryInput("");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag("main_category", mainCategoryInput);
              setMainCategoryInput("");
            }
          }}
          placeholder="Type main category and press Enter"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400"
        />
        <datalist id="main-category-suggestions">
          {mainCategorySuggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </section>

      <section className="space-y-2">
        <label
          className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
          htmlFor="filter-categories"
        >
          Categories
        </label>
        <TagPills values={query.category} onRemove={(value) => removeTag("category", value)} />
        <input
          id="filter-categories"
          list="category-suggestions"
          value={categoryInput}
          onChange={(event) => {
            const nextValue = event.target.value;
            setCategoryInput(nextValue);
            const suggestionOptions = categorySuggestions.map((item) => item.value);
            if (tryAddIfMatches("category", nextValue, suggestionOptions)) {
              setCategoryInput("");
            }
          }}
          onBlur={() => {
            const suggestionOptions = categorySuggestions.map((item) => item.value);
            if (tryAddIfMatches("category", categoryInput, suggestionOptions)) {
              setCategoryInput("");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag("category", categoryInput);
              setCategoryInput("");
            }
          }}
          placeholder="Type category and press Enter"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400"
        />
        <SuggestionsList id="category-suggestions" suggestions={categorySuggestions} />
      </section>

      <section className="space-y-2">
        <label
          className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
          htmlFor="filter-search"
        >
          Search
        </label>
        <input
          id="filter-search"
          value={query.q}
          onChange={(event) => updateQuery({ q: event.target.value, page: 1 })}
          placeholder="title contains..."
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400"
        />
      </section>

      <div className="space-y-2 text-sm text-slate-200">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-amber-400"
            checked={query.show_hidden}
            onChange={(event) => updateQuery({ show_hidden: event.target.checked, page: 1 })}
          />
          Show hidden items
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-amber-400"
            checked={query.favorite}
            onChange={(event) => updateQuery({ favorite: event.target.checked, page: 1 })}
          />
          Favorites only
        </label>
      </div>
    </form>
  );
}
