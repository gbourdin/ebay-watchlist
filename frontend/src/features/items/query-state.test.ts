import { parseQueryState, serializeQueryState, type ItemsQueryState } from "./query-state";

test("encodes filters into URL params", () => {
  const state: ItemsQueryState = {
    seller: ["alice", "bob"],
    category: ["Electric Guitars"],
    main_category: ["Musical Instruments"],
    q: "telecaster",
    favorite: true,
    show_hidden: true,
    sort: "price_low",
    view: "cards",
    page: 2,
    page_size: 50,
  };

  const encoded = serializeQueryState(state);
  const params = new URLSearchParams(encoded);

  expect(params.getAll("seller")).toEqual(["alice", "bob"]);
  expect(params.getAll("category")).toEqual(["Electric Guitars"]);
  expect(params.getAll("main_category")).toEqual(["Musical Instruments"]);
  expect(params.get("q")).toBe("telecaster");
  expect(params.get("favorite")).toBe("1");
  expect(params.get("show_hidden")).toBe("1");
  expect(params.get("sort")).toBe("price_low");
  expect(params.get("view")).toBe("cards");
  expect(params.get("page")).toBe("2");
  expect(params.get("page_size")).toBe("50");
});

test("parses URL params into typed query state", () => {
  const state = parseQueryState(
    "?seller=alice&category=Electric+Guitars&main_category=Musical+Instruments&q=tele&favorite=1&show_hidden=1&sort=bids_desc&view=hybrid&page=3&page_size=25"
  );

  expect(state).toEqual({
    seller: ["alice"],
    category: ["Electric Guitars"],
    main_category: ["Musical Instruments"],
    q: "tele",
    favorite: true,
    show_hidden: true,
    sort: "bids_desc",
    view: "hybrid",
    page: 3,
    page_size: 25,
  });
});
