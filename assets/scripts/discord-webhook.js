/**
 * =========================================================
 * discord-webhook.js
 * ---------------------------------------------------------
 * Gedeelde service om berichten vanuit formulieren naar
 * Discord te sturen via een veilige proxy (Apps Script).
 *
 * Ondersteunt:
 * - gewone content
 * - markdown formatting per formType
 * - Discord embeds per formType
 *
 * Waarom via een proxy?
 * - Discord webhook URL blijft geheim
 * - Geen CORS-problemen in frontend
 * - Herbruikbaar voor meerdere formulieren
 * =========================================================
 */

window.DiscordWebhookService = (() => {
  /**
   * Veilig tekstveld.
   * @param {any} value
   * @param {string} fallback
   * @returns {string}
   */
  function safeText(value, fallback = "-") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
  }

  /**
   * Knipt tekst af zodat Discord-limieten niet overschreden worden.
   * @param {string} value
   * @param {number} maxLength
   * @returns {string}
   */
  function truncate(value, maxLength) {
    const text = String(value || "");
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
  }

  /**
   * Probeert datum leesbaar te maken.
   * Verwacht meestal YYYY-MM-DD.
   * @param {string} value
   * @returns {string}
   */
  function formatDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return "-";

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return raw;

    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }

  /**
   * Zet array van strings om naar nette bullet list.
   * @param {string[]} items
   * @returns {string}
   */
  function toBulletList(items) {
    if (!Array.isArray(items) || !items.length) return "-";
    return items
      .map(item => safeText(item, ""))
      .filter(Boolean)
      .map(item => `• ${item}`)
      .join("\n");
  }

  /**
   * Bouwt markdown content op per formulier.
   * Dit is fallback / extra context naast embeds.
   *
   * @param {Object} options
   * @param {string} options.formType
   * @param {string} options.content
   * @param {Object} [options.extraData]
   * @returns {string}
   */
  function formatDiscordMessage({ formType, content, extraData = {} }) {
    switch (formType) {
      case "evaluation":
        return formatEvaluationContent(extraData, content);

      case "absence":
        return formatAbsenceContent(extraData, content);

      default:
        return safeText(content, "");
    }
  }

  function formatEvaluationContent(data, fallback = "") {
    const lines = [
      "__**📋 EMS EVALUATIEVERSLAG**__",
      "",
      `**👤 Medewerker:** ${safeText(data.employeeName)}`,
      `**📞 Roepnummer:** ${safeText(data.callSign)}`,
      `**🏅 Rang:** ${safeText(data.rank)}`,
      `**🧑‍⚕️ Evaluator:** ${safeText(data.evaluatorName)}`,
      `**🎖️ Rang evaluator:** ${safeText(data.evaluatorRank)}`,
      `**📄 Type evaluatie:** ${safeText(data.evaluationType)}`,
      `**📅 Datum:** ${formatDate(data.date)}`,
      `**⭐ Algemene beoordeling:** ${safeText(data.finalScore)}`,
      `**📌 Eindbesluit:** ${safeText(data.decision)}`
    ];

    if (fallback && fallback.trim()) {
      lines.push("", "**Volledige rapporttekst**", `>>> ${truncate(fallback.trim(), 1800)}`);
    }

    return lines.join("\n");
  }

  function formatAbsenceContent(data, fallback = "") {
    const lines = [
      "__**📅 AFWEZIGHEIDSMELDING**__",
      "",
      `**👤 Naam:** ${safeText(data.name)}`,
      `**📞 Roepnummer:** ${safeText(data.callSign)}`,
      `**🏅 Rang:** ${safeText(data.rank)}`,
      `**📆 Startdatum:** ${formatDate(data.startDate)}`,
      `**📆 Einddatum:** ${formatDate(data.endDate)}`,
      `**📌 Reden:** ${safeText(data.reason)}`
    ];

    if (fallback && fallback.trim()) {
      lines.push("", "**Extra toelichting**", `>>> ${truncate(fallback.trim(), 1800)}`);
    }

    return lines.join("\n");
  }

  /**
   * Bouwt embeds op per formulier.
   *
   * @param {Object} options
   * @param {string} options.formType
   * @param {string} options.content
   * @param {Object} [options.extraData]
   * @returns {Array<Object>}
   */
  function buildEmbeds({ formType, content, extraData = {} }) {
    switch (formType) {
      case "evaluation":
        return [buildEvaluationEmbed(extraData, content)];

      case "absence":
        return [buildAbsenceEmbed(extraData, content)];

      default:
        return [buildDefaultEmbed(formType, extraData, content)];
    }
  }

  function buildEvaluationEmbed(data, content = "") {
    const fields = [
      {
        name: "👤 Medewerker",
        value: safeText(data.employeeName),
        inline: true
      },
      {
        name: "📞 Roepnummer",
        value: safeText(data.callSign),
        inline: true
      },
      {
        name: "🏅 Rang",
        value: safeText(data.rank),
        inline: true
      },
      {
        name: "🧑‍⚕️ Evaluator",
        value: safeText(data.evaluatorName),
        inline: true
      },
      {
        name: "🎖️ Rang evaluator",
        value: safeText(data.evaluatorRank),
        inline: true
      },
      {
        name: "📄 Type evaluatie",
        value: safeText(data.evaluationType),
        inline: true
      },
      {
        name: "📅 Datum",
        value: formatDate(data.date),
        inline: true
      },
      {
        name: "⭐ Algemene beoordeling",
        value: safeText(data.finalScore),
        inline: true
      },
      {
        name: "📌 Eindbesluit",
        value: safeText(data.decision),
        inline: true
      }
    ];

    if (data.context) {
      fields.push({
        name: "📝 Context / aanleiding",
        value: truncate(safeText(data.context), 1024),
        inline: false
      });
    }

    if (data.strengths) {
      fields.push({
        name: "💪 Sterktes",
        value: truncate(safeText(data.strengths), 1024),
        inline: false
      });
    }

    if (data.improvements) {
      fields.push({
        name: "📈 Werkpunten",
        value: truncate(safeText(data.improvements), 1024),
        inline: false
      });
    }

    if (data.agreements) {
      fields.push({
        name: "🤝 Afspraken / opvolging",
        value: truncate(safeText(data.agreements), 1024),
        inline: false
      });
    }

    if (Array.isArray(data.categoryResults) && data.categoryResults.length) {
      const categoryText = data.categoryResults
        .map(item => {
          const category = safeText(item.category);
          const score = safeText(item.score);
          const comment = safeText(item.comment, "");
          return comment
            ? `• **${category}:** ${score}\n  ↳ ${comment}`
            : `• **${category}:** ${score}`;
        })
        .join("\n");

      fields.push({
        name: "📊 Beoordeling per onderdeel",
        value: truncate(categoryText, 1024),
        inline: false
      });
    }

    if (content && content.trim()) {
      fields.push({
        name: "📄 Volledige rapporttekst",
        value: truncate(content.trim(), 1024),
        inline: false
      });
    }

    return {
      title: "EMS Evaluatieverslag",
      description: "Automatisch ingestuurd vanuit de EMS-tool.",
      color: 15158332,
      fields,
      footer: {
        text: `Tool: evaluation`
      },
      timestamp: new Date().toISOString()
    };
  }

  function buildAbsenceEmbed(data, content = "") {
    const fields = [
      {
        name: "👤 Naam",
        value: safeText(data.name),
        inline: true
      },
      {
        name: "📞 Roepnummer",
        value: safeText(data.callSign),
        inline: true
      },
      {
        name: "🏅 Rang",
        value: safeText(data.rank),
        inline: true
      },
      {
        name: "📆 Startdatum",
        value: formatDate(data.startDate),
        inline: true
      },
      {
        name: "📆 Einddatum",
        value: formatDate(data.endDate),
        inline: true
      },
      {
        name: "📌 Reden",
        value: safeText(data.reason),
        inline: true
      }
    ];

    if (data.note) {
      fields.push({
        name: "📝 Toelichting",
        value: truncate(safeText(data.note), 1024),
        inline: false
      });
    }

    if (content && content.trim()) {
      fields.push({
        name: "📄 Volledige melding",
        value: truncate(content.trim(), 1024),
        inline: false
      });
    }

    return {
      title: "EMS Afwezigheidsmelding",
      description: "Automatisch ingestuurd vanuit de EMS-tool.",
      color: 3447003,
      fields,
      footer: {
        text: `Tool: absence`
      },
      timestamp: new Date().toISOString()
    };
  }

  function buildDefaultEmbed(formType, data, content = "") {
    const fields = [
      {
        name: "Formulier",
        value: safeText(formType || "default"),
        inline: true
      }
    ];

    const extraKeys = Object.keys(data || {});
    if (extraKeys.length) {
      const extraText = extraKeys
        .map(key => `• **${key}:** ${safeText(data[key])}`)
        .join("\n");

      fields.push({
        name: "Metadata",
        value: truncate(extraText, 1024),
        inline: false
      });
    }

    if (content && content.trim()) {
      fields.push({
        name: "Inhoud",
        value: truncate(content.trim(), 1024),
        inline: false
      });
    }

    return {
      title: "EMS Formulier",
      description: "Automatisch ingestuurd vanuit de EMS-tool.",
      color: 9807270,
      fields,
      footer: {
        text: `Tool: ${safeText(formType || "default")}`
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verstuurt een formulierbericht naar een tussenendpoint.
   *
   * @param {Object} options
   * @param {string} options.endpointUrl - URL van de Apps Script web app
   * @param {string} options.formType - Type formulier, bv. "absence"
   * @param {string} options.content - Berichtinhoud
   * @param {string} [options.username] - Afzendernaam in Discord
   * @param {Object} [options.extraData] - Extra metadata
   * @param {boolean} [options.useEmbeds=true] - Embed verzending aan/uit
   * @returns {Promise<Object>}
   */
  async function sendFormMessage({
    endpointUrl,
    formType,
    content,
    username,
    extraData,
    useEmbeds = true
  }) {
    if (!endpointUrl) {
      throw new Error("Geen endpointUrl opgegeven.");
    }

    if (!content || !content.trim()) {
      throw new Error("Geen berichtinhoud opgegeven.");
    }

    const normalizedFormType = formType || "default";
    const normalizedExtraData = extraData || {};

    const formattedContent = formatDiscordMessage({
      formType: normalizedFormType,
      content,
      extraData: normalizedExtraData
    });

    const embeds = useEmbeds
      ? buildEmbeds({
          formType: normalizedFormType,
          content,
          extraData: normalizedExtraData
        })
      : [];

    const payload = {
      formType: normalizedFormType,
      content: formattedContent,
      username: username || "EMS Tool",
      extraData: normalizedExtraData,
      embeds
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
    sendFormMessage,
    formatDiscordMessage,
    buildEmbeds
  };
})();