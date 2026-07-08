/* ============================================================
   POS-Kasir Animation & UX Enhancement Engine
   ------------------------------------------------------------
   Additive only — uses MutationObserver + event delegation.
   Does NOT import, modify, or override any function in app.js.
   Data model, backup/restore, and report logic are untouched.
   ============================================================ */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Helpers (mirror app.js formatting, do NOT import) ---- */
  var formatRupiah = function (n) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
  };
  var parseNumeric = function (text) {
    return parseInt(String(text).replace(/[^\d]/g, ""), 10) || 0;
  };
  function haptic(pattern) {
    if (!prefersReducedMotion && navigator.vibrate) navigator.vibrate(pattern);
  }

  /* ============================================================
     Toast notification system
     ============================================================ */
  function showToast(message, type) {
    type = type || "info";
    var container = document.querySelector(".pos-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "pos-toast-container";
      document.body.appendChild(container);
    }
    var toast = document.createElement("div");
    toast.className = "pos-toast " + type;
    var icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5" stroke-linecap="round"/></svg>'
    };
    toast.innerHTML = (icons[type] || icons.info) + "<span>" + message + "</span>";
    container.appendChild(toast);
    setTimeout(function () {
      toast.classList.add("leaving");
      setTimeout(function () { toast.remove(); }, 300);
    }, 2800);
  }
  window.posToast = showToast;

  /* ============================================================
     1. Ripple effect + haptic on button press
     ============================================================ */
  if (!prefersReducedMotion) {
    document.addEventListener("click", function (e) {
      var target = e.target.closest(
        ".btn,.checkout-btn,.payment-option,.nav,.inventory-action," +
        ".utility-option,.reset-tab,.dialog-close,.cashier-category," +
        ".cashier-note-button,.reset-select-all,.report-empty-action"
      );
      if (!target) return;
      var rect = target.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
      ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
      target.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 600);
      haptic(10);
    });
  }

  /* ============================================================
     2. Cart bump on quantity change
     ============================================================ */
  if (!prefersReducedMotion) {
    var prevQty = new Map();
    var cartObserver = new MutationObserver(function () {
      var items = document.querySelectorAll("#cartItems .cart-item");
      items.forEach(function (item) {
        var plusBtn = item.querySelector("[data-cart-plus]");
        if (!plusBtn) return;
        var itemId = plusBtn.getAttribute("data-cart-plus");
        var qtyEl = item.querySelector(".cart-item-actions b");
        if (!qtyEl) return;
        var qty = parseInt(qtyEl.textContent, 10) || 0;
        var prev = prevQty.get(itemId);
        if (prev !== undefined && prev !== qty) {
          item.classList.remove("bump");
          void item.offsetWidth; /* force reflow to restart animation */
          item.classList.add("bump");
          haptic(15);
        }
        prevQty.set(itemId, qty);
      });
      /* Clean up removed items from tracking map */
      var currentIds = new Set();
      items.forEach(function (i) {
        var btn = i.querySelector("[data-cart-plus]");
        if (btn) currentIds.add(btn.getAttribute("data-cart-plus"));
      });
      Array.from(prevQty.keys()).forEach(function (id) {
        if (!currentIds.has(id)) prevQty.delete(id);
      });
    });
    var cartItemsEl = document.getElementById("cartItems");
    if (cartItemsEl) {
      cartObserver.observe(cartItemsEl, { childList: true, subtree: true, characterData: true });
    }
  }

  /* ============================================================
     3. Cart total pulse on change
     ============================================================ */
  if (!prefersReducedMotion) {
    var totalEl = document.getElementById("cartTotal");
    if (totalEl) {
      var lastTotal = totalEl.textContent;
      var totalObserver = new MutationObserver(function () {
        if (totalEl.textContent !== lastTotal) {
          lastTotal = totalEl.textContent;
          totalEl.classList.remove("pulse");
          void totalEl.offsetWidth;
          totalEl.classList.add("pulse");
          setTimeout(function () { totalEl.classList.remove("pulse"); }, 400);
        }
      });
      totalObserver.observe(totalEl, { childList: true, characterData: true, subtree: true });
    }
  }

  /* ============================================================
     4. Count-up dashboard metrics
     ============================================================ */
  var metricConfig = {
    dashOmzet: { format: formatRupiah, lastValue: 0 },
    dashProfit: { format: formatRupiah, lastValue: 0 },
    dashQty: { format: function (n) { return String(Math.round(n)); }, lastValue: 0 }
  };
  var animatingMetrics = new Set();

  function countUp(elementId, targetValue, formatter) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var startValue = metricConfig[elementId] ? metricConfig[elementId].lastValue : 0;
    if (targetValue === startValue) {
      el.textContent = formatter(targetValue);
      return;
    }
    animatingMetrics.add(elementId);
    var duration = 700;
    var startTime = performance.now();
    function tick(now) {
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); /* ease-out-cubic */
      var current = startValue + (targetValue - startValue) * eased;
      el.textContent = formatter(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatter(targetValue);
        if (metricConfig[elementId]) metricConfig[elementId].lastValue = targetValue;
        animatingMetrics.delete(elementId);
        el.classList.remove("pulse");
        void el.offsetWidth;
        el.classList.add("pulse");
        setTimeout(function () { el.classList.remove("pulse"); }, 400);
      }
    }
    requestAnimationFrame(tick);
  }

  function initCountUp() {
    Object.keys(metricConfig).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var initialValue = parseNumeric(el.textContent);
      if (initialValue > 0) {
        metricConfig[id].lastValue = 0;
        countUp(id, initialValue, metricConfig[id].format);
      }
    });
  }

  function setupMetricObservers() {
    Object.keys(metricConfig).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var observer = new MutationObserver(function () {
        if (animatingMetrics.has(id)) return; /* skip during our own animation */
        var newValue = parseNumeric(el.textContent);
        if (newValue !== metricConfig[id].lastValue) {
          countUp(id, newValue, metricConfig[id].format);
        }
      });
      observer.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ============================================================
     5. Stagger reveal (IntersectionObserver)
     ============================================================ */
  var revealObserver = null;

  function setupReveal() {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) return;
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var siblings = Array.from(
            entry.target.parentElement ? entry.target.parentElement.children : []
          );
          var index = siblings.indexOf(entry.target);
          entry.target.style.setProperty("--reveal-delay", (index * 0.06) + "s");
          entry.target.classList.add("reveal-in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
  }

  function observeRevealables() {
    if (!revealObserver) return;
    var selector =
      ".card:not(.reveal-in),.dashboard-metric-card:not(.reveal-in)," +
      ".product-summary-card:not(.reveal-in),.report-stat-card:not(.reveal-in)," +
      ".setting-card:not(.reveal-in),.audit-stat-card:not(.reveal-in)," +
      ".product-manage-card:not(.reveal-in)";
    document.querySelectorAll(selector).forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ============================================================
     6. Page transition — re-observe revealables on page switch
     ============================================================ */
  function setupPageObserver() {
    var pageObserver = new MutationObserver(function () {
      if (revealObserver) {
        setTimeout(observeRevealables, 60);
      }
    });
    document.querySelectorAll(".page").forEach(function (page) {
      pageObserver.observe(page, { attributes: true, attributeFilter: ["class"] });
    });
  }

  /* ============================================================
     7. Dialog entrance animation
     ============================================================ */
  function setupDialogObservers() {
    document.querySelectorAll("dialog").forEach(function (dialog) {
      var observer = new MutationObserver(function () {
        if (dialog.open) {
          dialog.classList.remove("dialog-enter");
          void dialog.offsetWidth;
          dialog.classList.add("dialog-enter");
        }
      });
      observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    });
  }

  /* ============================================================
     8. Success checkmark + toast on receipt dialog open
     ============================================================ */
  var lastReceiptOpen = 0;
  function setupReceiptObserver() {
    var receiptDialog = document.getElementById("receiptDialog");
    if (!receiptDialog) return;
    var observer = new MutationObserver(function () {
      if (receiptDialog.open && Date.now() - lastReceiptOpen > 800) {
        lastReceiptOpen = Date.now();
        haptic([20, 40, 20]);
        showToast("Transaksi berhasil", "success");
        injectSuccessCheck(receiptDialog);
      }
    });
    observer.observe(receiptDialog, { attributes: true, attributeFilter: ["open"] });
  }

  function injectSuccessCheck(dialog) {
    var existing = dialog.querySelector(".pos-success-check");
    if (existing) existing.remove();
    var check = document.createElement("div");
    check.className = "pos-success-check";
    check.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "<span>Transaksi Berhasil</span>";
    var header = dialog.querySelector(".receipt-dialog-header");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(check, header.nextSibling);
    } else {
      dialog.prepend(check);
    }
    setTimeout(function () { check.remove(); }, 3500);
  }

  /* ============================================================
     9. Skeleton loading shimmer on page switch
        Shows brief skeleton placeholders in metric/summary
        containers before real content renders, giving a
        polished native-app loading feel. Does NOT touch
        data or report logic — purely visual overlay.
     ============================================================ */
  var skeletonTimers = [];

  function clearSkeletons() {
    skeletonTimers.forEach(function (t) { clearTimeout(t); });
    skeletonTimers = [];
    document.querySelectorAll(".pos-skeleton-card").forEach(function (el) {
      el.remove();
    });
    document.querySelectorAll(".pos-skeleton").forEach(function (el) {
      el.classList.remove("pos-skeleton");
    });
  }

  function showSkeletons(page) {
    if (prefersReducedMotion) return;
    clearSkeletons();

    /* Dashboard metrics — inject skeleton cards */
    if (page.id === "dashboard") {
      var metricsGrid = page.querySelector(".dashboard-metrics");
      if (metricsGrid) {
        for (var i = 0; i < 4; i++) {
          var skel = document.createElement("div");
          skel.className = "pos-skeleton-card";
          skel.style.minHeight = "112px";
          metricsGrid.appendChild(skel);
          skeletonTimers.push(setTimeout(function (s) {
            return function () { s.remove(); };
          }(skel), 350));
        }
      }
    }

    /* Product summary cards */
    if (page.id === "produk") {
      var summaryGrid = page.querySelector(".product-summary-grid");
      if (summaryGrid) {
        for (var j = 0; j < 4; j++) {
          var skel2 = document.createElement("div");
          skel2.className = "pos-skeleton-card";
          skel2.style.minHeight = "124px";
          summaryGrid.appendChild(skel2);
          skeletonTimers.push(setTimeout(function (s) {
            return function () { s.remove(); };
          }(skel2), 350));
        }
      }
    }

    /* Report stat cards */
    if (page.id === "laporan") {
      var statGrid = page.querySelector(".report-stats");
      if (statGrid) {
        for (var k = 0; k < 4; k++) {
          var skel3 = document.createElement("div");
          skel3.className = "pos-skeleton-card";
          skel3.style.minHeight = "98px";
          statGrid.appendChild(skel3);
          skeletonTimers.push(setTimeout(function (s) {
            return function () { s.remove(); };
          }(skel3), 350));
        }
      }
    }

    /* Clear skeletons after a short delay regardless */
    skeletonTimers.push(setTimeout(clearSkeletons, 500));
  }

  function setupSkeletonObserver() {
    document.querySelectorAll(".page").forEach(function (page) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.attributeName === "class" && page.classList.contains("active")) {
            showSkeletons(page);
          }
        });
      });
      observer.observe(page, { attributes: true, attributeFilter: ["class"] });
    });
  }

  /* ============================================================
     Init — event-based hooks active immediately;
     initial-load animations (reveal + count-up) delayed
     until splash screen finishes.
     ============================================================ */
  function initAfterSplash() {
    setupReveal();
    observeRevealables();
    initCountUp();
    setupMetricObservers();
  }

  /* ============================================================
     10. Cart item slide-out on remove
         Intercepts the remove-cart click in the CAPTURE phase
         (fires before app.js bubble handler), plays the slide-out
         animation, then re-dispatches a synthetic click so app.js
         performs the real removal + renderAll(). Purely additive —
         does NOT import or override changeCartItem/renderCart.
         The re-dispatch is skipped by the capture handler because
         the item already carries the "removing" class.
      ============================================================ */
  if (!prefersReducedMotion) {
    var cartItemsContainer = document.getElementById("cartItems");
    if (cartItemsContainer) {
      cartItemsContainer.addEventListener("click", function (e) {
        var removeBtn = e.target.closest("[data-cart-remove]");
        if (!removeBtn) return;
        var cartItem = removeBtn.closest(".cart-item");
        /* If already removing, let the event pass through to app.js */
        if (!cartItem || cartItem.classList.contains("removing")) return;

        /* Prevent app.js from removing immediately */
        e.stopPropagation();
        e.preventDefault();

        cartItem.classList.add("removing");
        haptic([12, 24]);

        /* After the slide-out finishes, let app.js do the real removal */
        setTimeout(function () {
          removeBtn.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window
          }));
        }, 280);
      }, true); /* capture phase — runs before app.js bubble handler */
    }
  }

  /* Active immediately — no initial animation needed */
  setupPageObserver();
  setupDialogObservers();
  setupReceiptObserver();
  setupSkeletonObserver();

  /* Delayed until splash is gone (body.loaded class) */
  if (document.body.classList.contains("loaded")) {
    initAfterSplash();
  } else {
    var bodyObs = new MutationObserver(function () {
      if (document.body.classList.contains("loaded")) {
        bodyObs.disconnect();
        initAfterSplash();
      }
    });
    bodyObs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }
})();

