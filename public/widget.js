(function () {
  var script =
    document.currentScript ||
    document.querySelector('script[src*="widget.js"]');
  if (!script || document.getElementById("cg-widget-root")) return;
  var origin = new URL(script.src, window.location.href).origin;
  var label = script.getAttribute("data-label") || "Open Cedar Grove chat";
  var position = script.getAttribute("data-position") === "left" ? "left" : "right";

  var root = document.createElement("div");
  root.id = "cg-widget-root";
  root.style.position = "fixed";
  root.style.zIndex = "2147483000";
  root.style.bottom = "20px";
  root.style[position] = "20px";
  root.style.fontFamily = "Outfit, ui-sans-serif, system-ui, sans-serif";

  var button = document.createElement("button");
  button.type = "button";
  button.id = "cg-launcher";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "cg-widget-panel");
  button.textContent = "Chat";
  button.style.cssText =
    "height:56px;min-width:56px;padding:0 18px;border:0;border-radius:999px;background:#1f4d3a;color:#f6f1e7;font:600 15px/1 inherit;box-shadow:0 12px 30px rgba(31,77,58,.35);cursor:pointer;";

  var panel = document.createElement("div");
  panel.id = "cg-widget-panel";
  panel.hidden = true;
  panel.style.cssText =
    "position:absolute;bottom:68px;" +
    position +
    ":0;width:min(380px,calc(100vw - 32px));height:min(640px,calc(100vh - 120px));background:#f3eee4;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(42,33,24,.28);";

  var frame = document.createElement("iframe");
  frame.src = origin + "/embed";
  frame.title = "Cedar Grove Family Clinic chat";
  frame.style.cssText = "width:100%;height:100%;border:0;background:#f3eee4;";
  panel.appendChild(frame);

  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.textContent = open ? "Close" : "Chat";
    if (!open) button.focus();
  }

  button.addEventListener("click", function () {
    setOpen(panel.hidden);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  root.appendChild(panel);
  root.appendChild(button);
  document.body.appendChild(root);
})();
