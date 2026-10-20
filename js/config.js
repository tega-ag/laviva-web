/*
 * Laviva configuration.
 *
 * This file is loaded as a normal script, not a JavaScript module.
 * A normal script can run when a student opens index.html directly.
 * Only LavivaConfig is shared with the other scripts, through window.
 */
(function () {
  window.LavivaConfig = {
    businessName: "Laviva",

    /*
     * Set this to the confirmed business WhatsApp number in international format:
     * digits only, no plus sign, and no spaces.
     * Keep it different from whatsappNumberPlaceholder below.
     */
    whatsappNumber: "2348112549009",
    whatsappNumberPlaceholder: "0000000000000",

    /*
     * Leave url as an empty string until the business provides an official link.
     * Only https links are turned into anchors. Empty values stay as text.
     */
    socialLinks: [
      { label: "Instagram", url: "https://www.instagram.com/" },
      { label: "Facebook", url: "https://www.facebook.com/" },
      { label: "TikTok", url: "https://www.tiktok.com/" }
    ],

    /*
     * These values must match the enquiry category options in index.html.
     * If you add a category, update both places.
     */
    enquiryCategories: [
      { value: "fashion", label: "Fashion" },
      { value: "wigs", label: "Wigs" },
      { value: "human-hair", label: "Human hair" },
      { value: "bespoke", label: "Bespoke outfit" },
      { value: "general", label: "General question" }
    ]
  };
})();
