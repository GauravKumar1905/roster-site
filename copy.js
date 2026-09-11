// One-click copy for every command on the page.
//
// The whole point of this page is to reduce effort, and selecting a multi-line command by hand
// is exactly the friction it exists to remove.
(function () {
  document.querySelectorAll(".copyblock").forEach(function (block) {
    var button = block.querySelector(".copybtn");
    if (!button) return;

    button.addEventListener("click", function () {
      var text = block.getAttribute("data-copy") || block.querySelector("code").innerText;
      navigator.clipboard.writeText(text).then(
        function () {
          button.textContent = "Copied";
          button.classList.add("copied");
          setTimeout(function () {
            button.textContent = "Copy";
            button.classList.remove("copied");
          }, 1800);
        },
        function () {
          // Clipboard blocked (insecure context, or permissions). Selecting the text is the
          // fallback, so the command is still one gesture away rather than none.
          var range = document.createRange();
          range.selectNodeContents(block.querySelector("code"));
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          button.textContent = "Selected";
          setTimeout(function () { button.textContent = "Copy"; }, 1800);
        },
      );
    });
  });
})();
