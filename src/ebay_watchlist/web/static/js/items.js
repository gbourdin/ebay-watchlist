(function () {
    const body = document.body;
    const form = document.getElementById("filter-form");
    const searchInput = document.getElementById("q");
    const navSidebarToggle = document.getElementById("nav-sidebar-toggle");
    const sidebarCollapseBtn = document.getElementById("sidebar-collapse-btn");
    const sidebarMobileCloseBtn = document.getElementById("sidebar-mobile-close");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const filterToggles = document.querySelectorAll(".filter-toggle");
    const sidebarStorageKey = "ebay-watchlist.sidebar.open";

    function isDesktop() {
        return window.matchMedia && window.matchMedia("(min-width: 992px)").matches;
    }

    function readSidebarOpen() {
        try {
            const stored = localStorage.getItem(sidebarStorageKey);
            if (stored === null) {
                return true;
            }
            return stored === "1";
        } catch (error) {
            return true;
        }
    }

    function writeSidebarOpen(isOpen) {
        try {
            localStorage.setItem(sidebarStorageKey, isOpen ? "1" : "0");
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function setDesktopSidebarOpen(isOpen, persist = true) {
        body.classList.toggle("sidebar-collapsed", !isOpen);
        if (persist) {
            writeSidebarOpen(isOpen);
        }
    }

    function setMobileSidebarOpen(isOpen) {
        body.classList.toggle("sidebar-mobile-open", isOpen);
    }

    function closeSidebar() {
        if (isDesktop()) {
            setDesktopSidebarOpen(false);
        } else {
            setMobileSidebarOpen(false);
        }
    }

    function toggleSidebar() {
        if (isDesktop()) {
            setDesktopSidebarOpen(body.classList.contains("sidebar-collapsed"));
        } else {
            setMobileSidebarOpen(!body.classList.contains("sidebar-mobile-open"));
        }
    }

    function syncSidebarState() {
        if (isDesktop()) {
            setMobileSidebarOpen(false);
            setDesktopSidebarOpen(readSidebarOpen(), false);
        } else {
            body.classList.remove("sidebar-collapsed");
            setMobileSidebarOpen(false);
        }
    }

    syncSidebarState();

    navSidebarToggle?.addEventListener("click", toggleSidebar);
    sidebarCollapseBtn?.addEventListener("click", closeSidebar);
    sidebarMobileCloseBtn?.addEventListener("click", () => setMobileSidebarOpen(false));
    sidebarBackdrop?.addEventListener("click", () => setMobileSidebarOpen(false));

    window.addEventListener("resize", () => {
        syncSidebarState();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !isDesktop() && body.classList.contains("sidebar-mobile-open")) {
            setMobileSidebarOpen(false);
        }
    });

    function submitForm() {
        form?.requestSubmit();
    }

    function initTagField(containerId) {
        const container = document.getElementById(containerId);
        if (!container || !form) {
            return;
        }

        const fieldName = container.dataset.field;
        const optionValues = JSON.parse(container.dataset.options || "[]").map((value) => String(value));
        const selectedValues = JSON.parse(container.dataset.selected || "[]").map((value) => String(value));
        const allowed = new Set(optionValues);

        const tagsRoot = container.querySelector(".tag-list");
        const input = container.querySelector(".tag-field");
        const hiddenRoot = container.querySelector(".tag-hidden");
        const values = [];

        function render() {
            tagsRoot.innerHTML = "";
            hiddenRoot.innerHTML = "";

            values.forEach((value) => {
                const tag = document.createElement("span");
                tag.className = "tag-pill";
                tag.textContent = value;

                const remove = document.createElement("button");
                remove.type = "button";
                remove.textContent = "\u00d7";
                remove.setAttribute("aria-label", `Remove ${value}`);
                remove.addEventListener("click", () => {
                    const index = values.indexOf(value);
                    if (index >= 0) {
                        values.splice(index, 1);
                        render();
                        submitForm();
                    }
                });

                tag.appendChild(remove);
                tagsRoot.appendChild(tag);

                const hidden = document.createElement("input");
                hidden.type = "hidden";
                hidden.name = fieldName;
                hidden.value = value;
                hiddenRoot.appendChild(hidden);
            });
        }

        function addValue(raw) {
            const value = String(raw || "").trim();
            if (!value) {
                return false;
            }

            if (allowed.size > 0 && !allowed.has(value)) {
                return false;
            }

            if (!values.includes(value)) {
                values.push(value);
                render();
                return true;
            }
            return false;
        }

        selectedValues.forEach((value) => addValue(value));

        input.addEventListener("keydown", (event) => {
            if ((event.key === "Enter" || event.key === "," || event.key === "Tab") && input.value.trim()) {
                event.preventDefault();
                const changed = addValue(input.value);
                input.value = "";
                if (changed) {
                    submitForm();
                }
            }

            if (event.key === "Backspace" && !input.value && values.length > 0) {
                values.pop();
                render();
                submitForm();
            }
        });

        input.addEventListener("change", () => {
            const changed = addValue(input.value);
            input.value = "";
            if (changed) {
                submitForm();
            }
        });

        input.addEventListener("blur", () => {
            const changed = addValue(input.value);
            input.value = "";
            if (changed) {
                submitForm();
            }
        });

        render();
    }

    initTagField("seller-filter");
    initTagField("main-category-filter");
    initTagField("category-filter");

    searchInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            submitForm();
        }
    });

    filterToggles.forEach((toggle) => {
        toggle.addEventListener("change", submitForm);
    });
})();
