/**
 * =========================================================
 * discord-webhook.js
 * ---------------------------------------------------------
 * Gedeelde service om berichten vanuit formulieren naar
 * Discord te sturen via een veilige proxy (Apps Script).
 *
 * Waarom via een proxy?
 * - Discord webhook URL blijft geheim
 * - Geen CORS-problemen in frontend
 * - Herbruikbaar voor meerdere formulieren
 * =========================================================
 */

window.DiscordWebhookService = (() => {
  /**
   * Verstuurt een formulierbericht naar een tussenendpoint.
   *
   * @param {Object} options
   * @param {string} options.endpointUrl - URL van de Apps Script web app
   * @param {string} options.formType - Type formulier, bv. "absence"
   * @param {string} options.content - Berichtinhoud
   * @param {string} [options.username] - Afzendernaam in Discord
   * @param {Object} [options.extraData] - Extra metadata
   * @returns {Promise<Object>}
   */
  async function sendFormMessage({
    endpointUrl,
    formType,
    content,
    username,
    extraData
  }) {
    if (!endpointUrl) {
      throw new Error("Geen endpointUrl opgegeven.");
    }

    if (!content || !content.trim()) {
      throw new Error("Geen berichtinhoud opgegeven.");
    }

    const payload = {
      formType: formType || "default",
      content: content.trim(),
      username: username || "EMS Tool",
      extraData: extraData || {}
    };

    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let result = null;

    try {
      result = text ? JSON.parse(text) : null;
    } catch {
      result = { raw: text };
    }

    if (!response.ok) {
      throw new Error(
        (result && result.error) || `HTTP-fout ${response.status}`
      );
    }

    if (result && result.ok === false) {
      throw new Error(result.error || "Onbekende fout bij verzenden.");
    }

    return result || { ok: true };
  }

  return {
    sendFormMessage
  };
})();
