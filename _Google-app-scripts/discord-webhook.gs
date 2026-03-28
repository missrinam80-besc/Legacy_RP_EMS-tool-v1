/**
 * =========================================================
 * EMS Discord Proxy - Google Apps Script
 * ---------------------------------------------------------
 * Ontvangt frontend-aanvragen en stuurt ze veilig door naar
 * Discord webhooks.
 *
 * Ondersteunt meerdere formulieren via formType.
 * Voorbeeld:
 * - absence
 * - evaluation
 * - leave-request
 * - reports
 *
 * Ondersteunt:
 * - content
 * - embeds
 * - logging naar sheet
 * =========================================================
 */

function doPost(e) {
  try {
    var rawBody = e && e.postData && e.postData.contents
      ? e.postData.contents
      : "{}";

    var data = JSON.parse(rawBody);

    var formType = sanitize_(data.formType || "default");
    var content = sanitizeMultiline_(data.content || "");
    var username = sanitize_(data.username || "EMS Tool");
    var extraData = data.extraData || {};
    var embeds = normalizeEmbeds_(data.embeds);

    if (!content && (!embeds || !embeds.length)) {
      return jsonOutput_({
        ok: false,
        error: "Geen content of embeds ontvangen."
      });
    }

    var webhookMap = getWebhookMap_();
    var webhookUrl = webhookMap[formType] || webhookMap.default;

    if (!webhookUrl) {
      return jsonOutput_({
        ok: false,
        error: "Geen webhook ingesteld voor dit formulier."
      });
    }

    var discordPayload = {
      username: username
    };

    if (content) {
      discordPayload.content = content;
    }

    if (embeds.length) {
      discordPayload.embeds = embeds;
    }

    var response = UrlFetchApp.fetch(webhookUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(discordPayload),
      muteHttpExceptions: true
    });

    var status = response.getResponseCode();
    var body = response.getContentText();

    if (status < 200 || status >= 300) {
      logRequest_(formType, username, content, extraData, embeds, false, status, body);

      return jsonOutput_({
        ok: false,
        error: "Discord gaf een fout terug.",
        status: status,
        body: body
      });
    }

    logRequest_(formType, username, content, extraData, embeds, true, status, body);

    return jsonOutput_({
      ok: true,
      message: "Bericht succesvol verzonden."
    });
  } catch (error) {
    logRequest_("unknown", "unknown", "", {}, [], false, 500, error.message);

    return jsonOutput_({
      ok: false,
      error: error.message
    });
  }
}

/**
 * Map van formulier-types naar Discord webhooks.
 * Gebruik Script Properties zodat secrets niet in code staan.
 */
function getWebhookMap_() {
  var props = PropertiesService.getScriptProperties();

  return {
    absence: props.getProperty("DISCORD_WEBHOOK_ABSENCE") || "",
    evaluation: props.getProperty("DISCORD_WEBHOOK_EVALUATION") || "",
    report: props.getProperty("DISCORD_WEBHOOK_REPORT") || "",
    default: props.getProperty("DISCORD_WEBHOOK_DEFAULT") || ""
  };
}

/**
 * Zorgt dat embeds altijd een veilige array zijn
 * en trimt waarden waar nuttig.
 */
function normalizeEmbeds_(embeds) {
  if (!Array.isArray(embeds)) {
    return [];
  }

  return embeds
    .filter(function(embed) {
      return embed && typeof embed === "object";
    })
    .map(function(embed) {
      var cleanEmbed = {};

      if (embed.title) cleanEmbed.title = truncate_(sanitizeMultiline_(embed.title), 256);
      if (embed.description) cleanEmbed.description = truncate_(sanitizeMultiline_(embed.description), 4096);
      if (typeof embed.color === "number") cleanEmbed.color = embed.color;
      if (embed.timestamp) cleanEmbed.timestamp = sanitize_(embed.timestamp);

      if (embed.footer && typeof embed.footer === "object") {
        cleanEmbed.footer = {};
        if (embed.footer.text) {
          cleanEmbed.footer.text = truncate_(sanitizeMultiline_(embed.footer.text), 2048);
        }
        if (embed.footer.icon_url) {
          cleanEmbed.footer.icon_url = sanitize_(embed.footer.icon_url);
        }
      }

      if (embed.author && typeof embed.author === "object") {
        cleanEmbed.author = {};
        if (embed.author.name) {
          cleanEmbed.author.name = truncate_(sanitizeMultiline_(embed.author.name), 256);
        }
        if (embed.author.url) {
          cleanEmbed.author.url = sanitize_(embed.author.url);
        }
        if (embed.author.icon_url) {
          cleanEmbed.author.icon_url = sanitize_(embed.author.icon_url);
        }
      }

      if (embed.fields && Array.isArray(embed.fields)) {
        cleanEmbed.fields = embed.fields
          .filter(function(field) {
            return field && typeof field === "object";
          })
          .slice(0, 25)
          .map(function(field) {
            return {
              name: truncate_(sanitizeMultiline_(field.name || "-"), 256),
              value: truncate_(sanitizeMultiline_(field.value || "-"), 1024),
              inline: Boolean(field.inline)
            };
          });
      }

      if (embed.thumbnail && typeof embed.thumbnail === "object" && embed.thumbnail.url) {
        cleanEmbed.thumbnail = {
          url: sanitize_(embed.thumbnail.url)
        };
      }

      if (embed.image && typeof embed.image === "object" && embed.image.url) {
        cleanEmbed.image = {
          url: sanitize_(embed.image.url)
        };
      }

      return cleanEmbed;
    });
}

/**
 * Logt aanvragen optioneel naar een sheet.
 * Maakt automatisch een sheet "WebhookLogs" aan indien nodig.
 */
function logRequest_(formType, username, content, extraData, embeds, success, status, responseBody) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;

    var sheet = ss.getSheetByName("WebhookLogs");
    if (!sheet) {
      sheet = ss.insertSheet("WebhookLogs");
      sheet.appendRow([
        "Timestamp",
        "FormType",
        "Username",
        "Success",
        "Status",
        "Content",
        "ExtraData",
        "Embeds",
        "Response"
      ]);
    }

    sheet.appendRow([
      new Date(),
      formType,
      username,
      success ? "TRUE" : "FALSE",
      status,
      content,
      JSON.stringify(extraData || {}),
      JSON.stringify(embeds || []),
      responseBody || ""
    ]);
  } catch (err) {
    // logging mag de flow niet blokkeren
  }
}

/**
 * JSON-response teruggeven aan frontend.
 */
function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Eenvoudige sanitizers
 */
function sanitize_(value) {
  return String(value || "").trim();
}

function sanitizeMultiline_(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function truncate_(value, maxLength) {
  var text = String(value || "");
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 1)) + "…";
}

/**
 * Test of UrlFetchApp rechten heeft.
 */
function testWebhookPermissions() {
  UrlFetchApp.fetch("https://discord.com");
}