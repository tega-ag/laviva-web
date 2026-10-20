/*
 * Page behaviour: menu, catalogue, product dialog, form, and footer.
 * The HTML is the structure. This file connects that structure to the data.
 */
(function () {
  var currentFilter = { type: "all" };
  var lastFocusedElement = null;
  var desktopNavQuery = window.matchMedia("(min-width: 1040px)");

  function validateEnquiry(input, allowedCategories) {
    var source = input || {};
    var name = String(source.name || "").trim();
    var email = String(source.email || "").trim();
    var category = String(source.category || "").trim();
    var message = String(source.message || "").replace(/\r\n/g, "\n").trim();
    var allowed = Array.isArray(allowedCategories) ? allowedCategories : [];
    var errors = {};

    if (name.length < 2 || name.length > 60) {
      errors.name = "Enter your name using 2 to 60 characters.";
    } else if (/[<>]/.test(name)) {
      errors.name = "Please remove the < and > characters from your name.";
    } else if (!/\p{L}/u.test(name)) {
      errors.name = "Enter your name using letters.";
    }

    if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errors.email = "Enter a valid email address, such as name@email.com.";
    }

    var selectedCategory = null;
    allowed.forEach(function (item) {
      if (item && item.value === category) {
        selectedCategory = item;
      }
    });
    if (!selectedCategory) {
      errors.category = "Choose an enquiry category.";
    }

    if (/[<>]/.test(message)) {
      errors.message = "Please remove the < and > characters from your message.";
    } else if (message.length < 10 || message.length > 600) {
      errors.message = "Enter a message between 10 and 600 characters.";
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors,
      value: {
        name: name,
        email: email,
        category: category,
        categoryLabel: selectedCategory ? selectedCategory.label : "",
        message: message
      }
    };
  }

  window.LavivaForm = { validateEnquiry: validateEnquiry };

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function scrollToElement(element) {
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  function focusHeading(section) {
    if (!section) {
      return;
    }
    var heading = section.querySelector("h2, h1");
    if (!heading) {
      return;
    }
    if (!heading.hasAttribute("tabindex")) {
      heading.setAttribute("tabindex", "-1");
    }
    heading.focus();
  }

  function watchImage(image) {
    if (!image) {
      return;
    }
    function markBroken() {
      image.classList.add("is-broken");
      var parent = image.parentElement;
      var fallback = parent ? parent.querySelector(".media-fallback") : null;
      if (fallback) {
        fallback.hidden = false;
      }
    }
    image.addEventListener("error", markBroken);
    if (image.complete && image.getAttribute("src") && image.naturalWidth === 0) {
      markBroken();
    }
  }

  function setupMobileNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    var label = document.getElementById("nav-toggle-label");
    if (!toggle || !nav || !label) {
      return { closeMenu: function () {} };
    }

    function isOpen() {
      return toggle.getAttribute("aria-expanded") === "true";
    }

    function closeMenu() {
      toggle.setAttribute("aria-expanded", "false");
      label.textContent = "Open menu";
      nav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    }

    function openMenu() {
      toggle.setAttribute("aria-expanded", "true");
      label.textContent = "Close menu";
      nav.classList.add("is-open");
      document.body.classList.add("nav-open");
      var firstLink = nav.querySelector("a");
      if (firstLink) {
        firstLink.focus();
      }
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) {
        closeMenu();
        toggle.focus();
      } else {
        openMenu();
      }
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });

    document.addEventListener("keydown", function (event) {
      if (!isOpen() || desktopNavQuery.matches) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        toggle.focus();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      var items = [toggle].concat(Array.prototype.slice.call(nav.querySelectorAll("a")));
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    function handleDesktopChange(event) {
      if (event.matches) {
        closeMenu();
      }
    }
    if (typeof desktopNavQuery.addEventListener === "function") {
      desktopNavQuery.addEventListener("change", handleDesktopChange);
    } else if (typeof desktopNavQuery.addListener === "function") {
      desktopNavQuery.addListener(handleDesktopChange);
    }

    return { closeMenu: closeMenu };
  }

  function setFilterButtonState() {
    document.querySelectorAll(".filter-button").forEach(function (button) {
      var pressed = false;
      if (currentFilter.type === "all" && button.getAttribute("data-filter") === "all") {
        pressed = true;
      }
      if (currentFilter.type === "category" && button.getAttribute("data-filter") === currentFilter.value) {
        pressed = true;
      }
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
  }

  function renderProducts() {
    var grid = document.getElementById("product-grid");
    var summary = document.getElementById("product-summary");
    var empty = document.getElementById("product-empty");
    var dialog = document.getElementById("product-dialog");
    if (!grid || !summary || !empty || !window.LavivaCatalog) {
      return;
    }
    if (dialog && dialog.open) {
      dialog.close();
    }

    var products = LavivaCatalog.filterProducts(window.LavivaProducts, currentFilter);
    grid.replaceChildren();
    products.forEach(function (product) {
      grid.appendChild(createProductCard(product));
    });

    summary.textContent = LavivaCatalog.describeResults(currentFilter, products.length);
    empty.hidden = products.length !== 0;
    setFilterButtonState();
  }

  function createProductCard(product) {
    var article = document.createElement("article");
    article.className = "product-card";

    var media = document.createElement("div");
    media.className = "media";
    var image = document.createElement("img");
    var urls = LavivaCatalog.imageUrls(product);
    image.alt = product.imageAlt;
    image.width = 800;
    image.height = 1000;
    image.loading = "lazy";
    image.decoding = "async";
    image.sizes = "(min-width: 1000px) 30vw, (min-width: 640px) 46vw, 100vw";
    if (urls.src) {
      image.src = urls.src;
      if (urls.srcset) {
        image.srcset = urls.srcset;
      }
    } else {
      image.classList.add("is-broken");
      fallback.hidden = false;
    }

    var fallback = document.createElement("p");
    fallback.className = "media-fallback";
    fallback.hidden = true;
    fallback.textContent = "Image unavailable";
    media.appendChild(image);
    media.appendChild(fallback);
    watchImage(image);

    var body = document.createElement("div");
    body.className = "product-body";

    var category = document.createElement("p");
    category.className = "eyebrow";
    category.textContent = LavivaCatalog.categoryLabel(product.category);

    var title = document.createElement("h3");
    title.textContent = product.name;

    var description = document.createElement("p");
    description.textContent = product.description;

    var price = document.createElement("p");
    price.className = "price";
    price.textContent = LavivaCatalog.formatPrice(product.price);

    var actions = document.createElement("div");
    actions.className = "card-actions";

    var viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "button button-secondary";
    viewButton.textContent = "View details";
    viewButton.addEventListener("click", function () {
      openProduct(product.id, viewButton);
    });

    var enquireButton = document.createElement("button");
    enquireButton.type = "button";
    enquireButton.className = "button button-primary";
    enquireButton.textContent = "Enquire";
    enquireButton.addEventListener("click", function () {
      openProduct(product.id, enquireButton);
    });

    actions.appendChild(viewButton);
    actions.appendChild(enquireButton);
    body.appendChild(category);
    body.appendChild(title);
    body.appendChild(description);
    body.appendChild(price);
    body.appendChild(actions);
    article.appendChild(media);
    article.appendChild(body);
    return article;
  }

  function applyFilter(filter) {
    currentFilter = filter && filter.type ? filter : { type: "all" };
    renderProducts();
  }

  function filterFromControl(control) {
    var collection = control.getAttribute("data-collection");
    var filterName = control.getAttribute("data-filter");
    if (collection) {
      return { type: "collection", value: collection };
    }
    if (filterName === "hair") {
      return { type: "group", value: "hair" };
    }
    if (filterName === "all") {
      return { type: "all" };
    }
    if (filterName) {
      return { type: "category", value: filterName };
    }
    return null;
  }

  function setupFilters() {
    document.querySelectorAll(".filter-button").forEach(function (button) {
      button.addEventListener("click", function () {
        var nextFilter = filterFromControl(button);
        if (nextFilter) {
          applyFilter(nextFilter);
        }
      });
    });

    document.querySelectorAll("[data-filter], [data-collection]").forEach(function (link) {
      if (link.classList.contains("filter-button")) {
        return;
      }
      link.addEventListener("click", function (event) {
        var nextFilter = filterFromControl(link);
        if (!nextFilter) {
          return;
        }
        event.preventDefault();
        applyFilter(nextFilter);
        var target = document.querySelector(link.getAttribute("href"));
        scrollToElement(target);
        focusHeading(target);
      });
    });
  }

  function setupProductDialog() {
    var dialog = document.getElementById("product-dialog");
    var closeButton = document.getElementById("product-dialog-close");
    if (!dialog || !closeButton || typeof dialog.showModal !== "function") {
      return;
    }

    closeButton.addEventListener("click", function () {
      dialog.close();
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener("close", function () {
      document.body.classList.remove("modal-open");
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    });

    var copyButton = document.getElementById("product-dialog-copy");
    if (copyButton) {
      copyButton.addEventListener("click", function () {
        var messageField = document.getElementById("product-dialog-message");
        copyText(messageField ? messageField.value : "", "product-dialog-status");
      });
    }

    watchImage(document.getElementById("product-dialog-image"));
  }

  function openProduct(productId, trigger) {
    var dialog = document.getElementById("product-dialog");
    var product = window.LavivaCatalog ? LavivaCatalog.getById(window.LavivaProducts, productId) : null;
    if (!dialog || !product || typeof dialog.showModal !== "function") {
      return;
    }

    var title = document.getElementById("product-dialog-title");
    var messageField = document.getElementById("product-dialog-message");
    if (!title || !messageField) {
      return;
    }

    lastFocusedElement = trigger || document.activeElement;
    document.getElementById("product-dialog-category").textContent = LavivaCatalog.categoryLabel(product.category);
    document.getElementById("product-dialog-title").textContent = product.name;
    document.getElementById("product-dialog-description").textContent = product.description;
    document.getElementById("product-dialog-meta").textContent =
      "Product ID: " + product.id + " · " + LavivaCatalog.collectionLabel(product.collection);
    document.getElementById("product-dialog-price").textContent = LavivaCatalog.formatPrice(product.price);

    var image = document.getElementById("product-dialog-image");
    var fallback = document.getElementById("product-dialog-fallback");
    var urls = LavivaCatalog.imageUrls(product);
    image.classList.remove("is-broken");
    fallback.hidden = true;
    image.alt = product.imageAlt;
    if (urls.src) {
      image.src = urls.src;
      image.srcset = urls.srcset || "";
    } else {
      image.removeAttribute("src");
      image.alt = "";
      fallback.hidden = false;
    }

    var message = LavivaWhatsApp.buildProductMessage(product);
    messageField.value = message;
    presentWhatsAppAction(message, "product-dialog-send", "product-dialog-status");

    if (!dialog.open) {
      dialog.showModal();
    }
    document.body.classList.add("modal-open");
    document.getElementById("product-dialog-close").focus();
  }

  function bindSafeExternalLink(link) {
    if (!link || link.getAttribute("data-guarded") === "true") {
      return;
    }
    link.setAttribute("data-guarded", "true");
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href") || "";
      if (href.indexOf("https://wa.me/") !== 0) {
        event.preventDefault();
      }
    });
  }

  function presentWhatsAppAction(message, linkId, statusId) {
    var link = document.getElementById(linkId);
    var status = document.getElementById(statusId);
    if (!link || !status || !window.LavivaWhatsApp) {
      return;
    }
    bindSafeExternalLink(link);
    var result = LavivaWhatsApp.createLink(message);
    if (result.ok) {
      link.href = result.url;
      link.hidden = false;
      status.textContent =
        "Review the message, then open WhatsApp and press send yourself. Opening WhatsApp does not mean the message has been delivered.";
    } else {
      link.hidden = true;
      link.removeAttribute("href");
      status.textContent =
        "The WhatsApp number in js/config.js is still a placeholder, so this page will not open a chat. Copy the message and use it when the real number has been added.";
    }
  }

  function copyText(text, statusId) {
    var status = document.getElementById(statusId);
    if (!text) {
      if (status) {
        status.textContent = "There is no message to copy yet.";
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          if (status) {
            status.textContent = "Message copied. Paste it into WhatsApp when you are ready. Copying does not send it.";
          }
        },
        function () {
          if (status) {
            status.textContent = "Copy is not available in this browser. Select the message and copy it manually.";
          }
        }
      );
      return;
    }
    if (status) {
      status.textContent = "Select the message and copy it manually.";
    }
  }

  function setupEnquiryLinks() {
    var select = document.getElementById("enquiry-category");
    if (!select) {
      return;
    }
    document.querySelectorAll("[data-enquiry-category]").forEach(function (link) {
      link.addEventListener("click", function () {
        var value = link.getAttribute("data-enquiry-category");
        var hasOption = Array.prototype.some.call(select.options, function (option) {
          return option.value === value;
        });
        if (hasOption) {
          select.value = value;
        }
      });
    });
  }

  function setFieldError(input, errorElement, message) {
    if (!input || !errorElement) {
      return;
    }
    if (message) {
      input.setAttribute("aria-invalid", "true");
      errorElement.textContent = message;
      errorElement.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      errorElement.textContent = "";
      errorElement.hidden = true;
    }
  }

  function setupContactForm() {
    var form = document.getElementById("enquiry-form");
    if (!form || !window.LavivaConfig) {
      return;
    }
    var fields = {
      name: document.getElementById("enquiry-name"),
      email: document.getElementById("enquiry-email"),
      category: document.getElementById("enquiry-category"),
      message: document.getElementById("enquiry-message")
    };
    var errors = {
      name: document.getElementById("enquiry-name-error"),
      email: document.getElementById("enquiry-email-error"),
      category: document.getElementById("enquiry-category-error"),
      message: document.getElementById("enquiry-message-error")
    };
    var summary = document.getElementById("enquiry-error-summary");
    var success = document.getElementById("enquiry-success");
    var count = document.getElementById("enquiry-message-count");
    var copyButton = document.getElementById("enquiry-copy");

    function updateCount() {
      if (!count || !fields.message) {
        return;
      }
      count.textContent = fields.message.value.trim().length + " / 600 characters";
    }

    updateCount();
    if (fields.message) {
      fields.message.addEventListener("input", updateCount);
    }

    form.addEventListener("input", function () {
      if (success) {
        success.hidden = true;
      }
    });

    if (copyButton) {
      copyButton.addEventListener("click", function () {
        var preview = document.getElementById("enquiry-preview");
        copyText(preview ? preview.value : "", "enquiry-success-note");
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var result = validateEnquiry(
        {
          name: fields.name.value,
          email: fields.email.value,
          category: fields.category.value,
          message: fields.message.value
        },
        LavivaConfig.enquiryCategories
      );

      setFieldError(fields.name, errors.name, result.errors.name || "");
      setFieldError(fields.email, errors.email, result.errors.email || "");
      setFieldError(fields.category, errors.category, result.errors.category || "");
      setFieldError(fields.message, errors.message, result.errors.message || "");

      if (!result.valid) {
        if (success) {
          success.hidden = true;
        }
        if (summary) {
          summary.hidden = false;
          summary.textContent = "Please correct the highlighted fields. Nothing has been sent.";
          summary.focus();
        }
        var firstInvalid = form.querySelector("[aria-invalid='true']");
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      if (summary) {
        summary.hidden = true;
        summary.textContent = "";
      }
      var prepared = LavivaWhatsApp.buildContactMessage(result.value);
      var preview = document.getElementById("enquiry-preview");
      var note = document.getElementById("enquiry-success-note");
      if (preview) {
        preview.value = prepared;
      }
      if (success) {
        success.hidden = false;
      }
      presentWhatsAppAction(prepared, "enquiry-send", "enquiry-success-note");
      if (note) {
        note.focus();
      }
    });
  }

  function setupDirectWhatsAppButtons() {
    if (!window.LavivaWhatsApp) {
      return;
    }
    var note = document.getElementById("whatsapp-config-note");
    var configured = LavivaWhatsApp.isConfigured();
    if (note) {
      note.textContent = configured
        ? "Have a quick question or prefer a more personal touch? Connect with us on WhatsApp for assistance with our collections, bespoke orders, and other enquiries."
        : "Have a quick question or prefer a more personal touch? Connect with us on WhatsApp for assistance with our collections, bespoke orders, and other enquiries.";
    }

    var panelLink = document.querySelector(".contact-panel [data-whatsapp='general']");
    if (panelLink && !configured) {
      panelLink.textContent = "Chat with Us on WhatsApp";
    }

    document.querySelectorAll("[data-whatsapp='general']").forEach(function (control) {
      var result = LavivaWhatsApp.createLink(LavivaWhatsApp.generalMessage);
      if (result.ok && control.tagName === "A") {
        control.href = result.url;
        control.target = "_blank";
        control.rel = "noopener noreferrer";
        return;
      }
      control.addEventListener("click", function (event) {
        if (result.ok) {
          return;
        }
        event.preventDefault();
        var contact = document.getElementById("contact");
        scrollToElement(contact);
        if (note) {
          note.focus();
        }
      });
    });
  }

  function setupSocialLinks() {
    var list = document.getElementById("social-links");
    if (!list || !window.LavivaConfig || !Array.isArray(LavivaConfig.socialLinks)) {
      return;
    }
    list.replaceChildren();
    LavivaConfig.socialLinks.forEach(function (link) {
      var item = document.createElement("li");
      var url = link && typeof link.url === "string" ? link.url.trim() : "";
      var label = link && typeof link.label === "string" ? link.label : "Social link";
      if (/^https:\/\/[^\s]+$/.test(url)) {
        var anchor = document.createElement("a");
        anchor.href = url;
        anchor.textContent = label;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        item.appendChild(anchor);
      } else {
        item.textContent = label + " (official link not added yet)";
      }
      list.appendChild(item);
    });
  }

  function setupCopyright() {
    var year = document.getElementById("copyright-year");
    if (year) {
      year.textContent = String(new Date().getFullYear());
    }
  }

  function showSetupError() {
    var summary = document.getElementById("product-summary");
    if (summary) {
      summary.textContent = "The product scripts did not load. Check that the js folder is beside index.html.";
    }
  }

  function init() {
    document.querySelectorAll(".media img").forEach(watchImage);
    var navigation = setupMobileNav();
    if (!window.LavivaConfig || !window.LavivaCatalog || !window.LavivaWhatsApp) {
      showSetupError();
      setupCopyright();
      return;
    }
    setupFilters();
    setupProductDialog();
    setupEnquiryLinks();
    setupContactForm();
    setupDirectWhatsAppButtons();
    setupSocialLinks();
    setupCopyright();
    renderProducts();
    return navigation;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
