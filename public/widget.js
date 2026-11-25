(function () {
  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  if (!script || document.getElementById("cg-widget-root")) return;
  var origin = new URL(script.src, window.location.href).origin;
  var label = script.getAttribute("data-label") || "Open chat with Grove guide";
  var position = script.getAttribute("data-position") === "left" ? "left" : "right";
  var theme = script.getAttribute("data-theme") || "system";
  var immediate = script.getAttribute("data-immediate") === "true" || /embed-demo/.test(location.pathname);

  var root = document.createElement("div");
  root.id = "cg-widget-root";
  root.style.cssText = "position:fixed;z-index:2147483000;bottom:16px;" + position + ":16px;font-family:Geist,ui-sans-serif,system-ui,sans-serif;";

  var pills = document.createElement("div");
  pills.style.cssText = "display:flex;flex-direction:column;align-items:" + (position === "left" ? "flex-start" : "flex-end") + ";gap:8px;margin-bottom:12px;";

  var dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.setAttribute("aria-label", "Dismiss suggestions");
  dismiss.textContent = "×";
  dismiss.style.cssText = "width:24px;height:24px;border-radius:999px;border:1px solid rgba(31,77,58,.2);background:#fffcf8;cursor:pointer;";

  function pill(text, prompt) {
    var button = document.createElement("button");
    button.type = "button";
    button.dataset.testid = "launcher-nudge";
    button.textContent = text;
    button.style.cssText = "height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(31,77,58,.15);background:rgba(255,252,248,.92);color:#1e2a24;font:500 13px/1 inherit;cursor:pointer;box-shadow:0 8px 24px rgba(15,18,22,.08);";
    button.addEventListener("click", function () {
      setOpen(true);
      frame.contentWindow.postMessage({ type: "cg-prompt", text: prompt }, origin);
    });
    return button;
  }

  pills.appendChild(dismiss);
  pills.appendChild(pill("Check insurance", "Check insurance"));
  pills.appendChild(pill("Book a new-patient visit", "Book a new-patient visit"));
  if (sessionStorage.getItem("cg-nudges-dismissed") === "1") pills.hidden = true;

  var button = document.createElement("button");
  button.type = "button";
  button.id = "cg-launcher";
  button.dataset.testid = "chat-launcher";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "cg-widget-panel");
  button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2.2c.7 2.8.5 4.8-.5 6.6-2-.6-3.5-.2-4.8 1.1 1.9.4 3.3 1.6 3.9 3.8 1.1-2.3 2.5-3.8 4.9-4.2-1.4-1.1-2.3-2.5-2.4-4.2-.5.9-1.1 1.5-1.1 2.1V2.2Z"/><path d="M12 13.2V21" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round"/></svg>';
  button.style.cssText = "width:60px;height:60px;border:0;border-radius:999px;background:#1f4d3a;color:#f6f1e7;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 24px rgba(31,77,58,.35), inset 0 1px 0 rgba(255,255,255,.25);";

  var panel = document.createElement("div");
  panel.id = "cg-widget-panel";
  panel.hidden = true;
  panel.style.cssText = "position:absolute;bottom:76px;" + position + ":0;width:min(400px,calc(100vw - 32px));height:min(680px,calc(100dvh - 124px));border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(15,18,22,.2);background:#fffcf8;";

  var frame = document.createElement("iframe");
  frame.src = origin + "/embed?theme=" + encodeURIComponent(theme);
  frame.title = "Cedar Grove Family Clinic chat";
  frame.style.cssText = "width:100%;height:100%;border:0;background:#fffcf8;";
  panel.appendChild(frame);

  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", open ? "Close chat. " + label : label);
    button.innerHTML = open
      ? '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2.2c.7 2.8.5 4.8-.5 6.6-2-.6-3.5-.2-4.8 1.1 1.9.4 3.3 1.6 3.9 3.8 1.1-2.3 2.5-3.8 4.9-4.2-1.4-1.1-2.3-2.5-2.4-4.2-.5.9-1.1 1.5-1.1 2.1V2.2Z"/><path d="M12 13.2V21" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round"/></svg>';
    if (window.matchMedia("(max-width: 639px)").matches && open) {
      panel.style.position = "fixed";
      panel.style.inset = "0";
      panel.style.width = "100dvw";
      panel.style.height = "100dvh";
      panel.style.borderRadius = "0";
      panel.style.bottom = "0";
      button.hidden = true;
    } else {
      button.hidden = false;
      panel.style.position = "absolute";
      panel.style.inset = "";
      panel.style.width = "min(400px,calc(100vw - 32px))";
      panel.style.height = "min(680px,calc(100dvh - 124px))";
      panel.style.borderRadius = "24px";
      panel.style.bottom = "76px";
    }
    if (!open) button.focus();
  }

  button.addEventListener("click", function () {
    setOpen(panel.hidden);
  });
  dismiss.addEventListener("click", function () {
    sessionStorage.setItem("cg-nudges-dismissed", "1");
    pills.hidden = true;
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });
  window.addEventListener("cg-open-chat", function () {
    setOpen(true);
  });
  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    if (event.data && event.data.type === "cg-close") setOpen(false);
  });

  var teaser = document.createElement("div");
  teaser.dataset.testid = "launcher-teaser";
  teaser.style.cssText = "max-width:240px;margin-bottom:8px;padding:8px 12px;border-radius:16px;background:#fffcf8;color:#1e2a24;font:400 13px/1.4 inherit;box-shadow:0 8px 24px rgba(15,18,22,.12);border:1px solid rgba(31,77,58,.15);";
  teaser.textContent = "Need a visit or a plan check? I can book it today.";
  var teaserClose = document.createElement("button");
  teaserClose.type = "button";
  teaserClose.setAttribute("aria-label", "Dismiss teaser");
  teaserClose.textContent = "×";
  teaserClose.style.cssText = "float:right;border:0;background:transparent;cursor:pointer;";
  teaser.insertBefore(teaserClose, teaser.firstChild);
  teaser.hidden = true;
  teaserClose.addEventListener("click", function () {
    localStorage.setItem("cg-teaser-dismissed", "1");
    teaser.hidden = true;
  });
  if (localStorage.getItem("cg-teaser-dismissed") !== "1") {
    window.setTimeout(function () { teaser.hidden = false; }, 4000);
  }

  var stack = document.createElement("div");
  stack.style.cssText = "display:flex;flex-direction:column;align-items:" + (position === "left" ? "flex-start" : "flex-end") + ";";
  stack.appendChild(teaser);
  stack.appendChild(pills);
  stack.appendChild(panel);
  stack.appendChild(button);
  root.appendChild(stack);
  document.body.appendChild(root);

  var delay = immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1200;
  window.setTimeout(function () {
    pills.style.opacity = "1";
  }, delay);
  if (!immediate) pills.style.visibility = "hidden";
  window.setTimeout(function () {
    pills.style.visibility = "visible";
  }, delay);
})();
